"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const MAX_IMAGES = 4;
const MAX_SIZE = 10 * 1024 * 1024; // 10 Mo

/**
 * Crée une publication (feed global si groupId vide, sinon feed du groupe).
 * FormData : content, groupId?, files[] (images).
 * Les règles d'appartenance sont appliquées par la RLS (posts_insert).
 */
export async function createPost(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Non authentifié." };

  const content = String(formData.get("content") || "").trim();
  const groupId = String(formData.get("groupId") || "").trim() || null;
  const files = formData.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);

  if (!content && files.length === 0) return { ok: false, error: "Ajoutez du texte ou une image." };
  if (files.length > MAX_IMAGES) return { ok: false, error: `Maximum ${MAX_IMAGES} images.` };
  for (const f of files) {
    if (f.size > MAX_SIZE) return { ok: false, error: "Image trop lourde (max 10 Mo)." };
  }

  // Création de la publication (RLS vérifie l'appartenance au groupe)
  const { data: post, error } = await supabase
    .from("posts")
    .insert({ author_id: user.id, group_id: groupId, content: content || null })
    .select("id")
    .single();
  if (error || !post) return { ok: false, error: error?.message ?? "Publication impossible." };

  // Upload des images (bucket public 'posts') via client admin
  const admin = createAdminClient();
  const uploaded: { image_url: string; storage_path: string }[] = [];
  for (const f of files) {
    const ext = (f.name.split(".").pop() || "jpg").toLowerCase();
    const path = `${user.id}/${post.id}/${randomUUID()}.${ext}`;
    const buffer = Buffer.from(await f.arrayBuffer());
    const { error: upErr } = await admin.storage.from("posts").upload(path, buffer, {
      contentType: f.type || "image/jpeg", upsert: false,
    });
    if (upErr) continue; // on n'échoue pas toute la publication pour une image
    const { data: pub } = admin.storage.from("posts").getPublicUrl(path);
    uploaded.push({ image_url: pub.publicUrl, storage_path: path });
  }

  if (uploaded.length > 0) {
    await supabase.from("post_images").insert(
      uploaded.map((u) => ({ post_id: post.id, image_url: u.image_url, storage_path: u.storage_path }))
    );
    // Raccourci d'affichage : 1ère image
    await supabase.from("posts").update({ image_url: uploaded[0].image_url }).eq("id", post.id);
  }

  revalidatePath(groupId ? `/dashboard/groupes/${groupId}` : "/dashboard/actualites");
  return { ok: true, id: post.id };
}

/** Supprime une publication (auteur ou créateur du groupe via RLS) + ses fichiers. */
export async function deletePost(postId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Non authentifié." };

  // Récupère les chemins de stockage avant suppression
  const { data: imgs } = await supabase.from("post_images").select("storage_path").eq("post_id", postId);
  const paths = (imgs ?? []).map((i) => i.storage_path).filter(Boolean) as string[];

  const { error } = await supabase.from("posts").delete().eq("id", postId);
  if (error) return { ok: false, error: error.message };

  if (paths.length > 0) {
    const admin = createAdminClient();
    await admin.storage.from("posts").remove(paths);
  }
  return { ok: true };
}

/** Valide / masque une actualité (staff uniquement). */
export async function togglePostPublished(postId: string, published: boolean) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Non authentifié." };
  const { data: prof } = await supabase.from("users").select("role").eq("id", user.id).single();
  if (prof?.role !== "formateur" && prof?.role !== "admin") return { ok: false, error: "Accès refusé." };

  const admin = createAdminClient();
  const { error } = await admin.from("posts").update({ published }).eq("id", postId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/** Like / unlike. Renvoie l'état et le nouveau compteur. */
export async function toggleLike(postId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Non authentifié." };

  const { data: existing } = await supabase
    .from("likes").select("id").eq("post_id", postId).eq("user_id", user.id).maybeSingle();

  if (existing) {
    await supabase.from("likes").delete().eq("id", existing.id);
  } else {
    const { error } = await supabase.from("likes").insert({ post_id: postId, user_id: user.id });
    if (error) return { ok: false, error: error.message };
  }

  const { count } = await supabase
    .from("likes").select("*", { count: "exact", head: true }).eq("post_id", postId);
  return { ok: true, liked: !existing, count: count ?? 0 };
}

/** Ajoute un commentaire. */
export async function addComment(postId: string, content: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Non authentifié." };
  const text = content.trim();
  if (!text) return { ok: false, error: "Commentaire vide." };

  const { data, error } = await supabase
    .from("comments")
    .insert({ post_id: postId, author_id: user.id, content: text })
    .select("id, content, created_at, author_id, author:users(nom, role, avatar_url)")
    .single();
  if (error) return { ok: false, error: error.message };
  return { ok: true, comment: data };
}

/** Supprime son propre commentaire (RLS : author_id = auth.uid()). */
export async function deleteComment(commentId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Non authentifié." };
  const { error } = await supabase.from("comments").delete().eq("id", commentId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
