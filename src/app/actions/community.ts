"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { deleteBunnyVideo } from "@/lib/bunny/stream";

/**
 * L'élève partage un de ses travaux pratiques DÉJÀ téléversé (lesson_practicals)
 * sur le feed communauté. Aucun nouvel upload : on réutilise le fichier existant.
 */
export async function sharePracticalToFeed(practicalId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Non authentifié." };

  const admin = createAdminClient();
  const { data: prac } = await admin
    .from("lesson_practicals")
    .select("id, user_id, photo_url, video_url, note, lesson:lessons(chapter:chapters(course_id))")
    .eq("id", practicalId)
    .maybeSingle();
  if (!prac) return { ok: false, error: "Travail introuvable." };
  if (prac.user_id !== user.id) return { ok: false, error: "Accès refusé." };

  const { data: already } = await admin
    .from("community_media").select("id").eq("practical_id", practicalId).maybeSingle();
  if (already) return { ok: false, error: "Ce travail est déjà publié sur la communauté." };

  const mediaUrl = prac.video_url || prac.photo_url;
  if (!mediaUrl) return { ok: false, error: "Ce travail n'a ni photo ni vidéo." };
  const mediaKind: "video" | "image" = prac.video_url ? "video" : "image";
  const courseId = (prac.lesson as any)?.chapter?.course_id ?? null;

  // 1) Post (réutilise likes/commentaires)
  const { data: post, error: postErr } = await admin
    .from("posts")
    .insert({ author_id: user.id, group_id: null, content: prac.note ?? null, published: true })
    .select("id")
    .single();
  if (postErr || !post) return { ok: false, error: "Publication impossible." };

  // 2) community_media
  const { error: cmErr } = await admin.from("community_media").insert({
    post_id: post.id,
    source_type: "practical",
    media_kind: mediaKind,
    media_url: mediaUrl,
    thumbnail_url: mediaKind === "image" ? mediaUrl : null,
    course_id: courseId,
    practical_id: practicalId,
    status: "ready",
  });
  if (cmErr) {
    await admin.from("posts").delete().eq("id", post.id);
    return { ok: false, error: cmErr.message };
  }

  revalidatePath("/communaute");
  return { ok: true };
}

/** Supprime un média communauté (auteur du post ou admin) + sa vidéo Bunny. */
export async function deleteCommunityMedia(mediaId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Non authentifié." };

  const admin = createAdminClient();
  const { data: cm } = await admin
    .from("community_media")
    .select("id, post_id, bunny_video_id, post:posts(author_id)")
    .eq("id", mediaId)
    .maybeSingle();
  if (!cm) return { ok: false, error: "Introuvable." };

  const { data: prof } = await admin.from("users").select("role").eq("id", user.id).single();
  const isAdmin = prof?.role === "admin";
  if ((cm.post as any)?.author_id !== user.id && !isAdmin) return { ok: false, error: "Accès refusé." };

  // La suppression du post fait cascader community_media (FK on delete cascade).
  await admin.from("posts").delete().eq("id", cm.post_id);
  if (cm.bunny_video_id) await deleteBunnyVideo(cm.bunny_video_id);

  revalidatePath("/communaute");
  return { ok: true };
}

/** Suit / ne suit plus un membre. Renvoie le nouvel état + le nombre d'abonnés. */
export async function toggleFollow(targetId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Non authentifié." };
  if (user.id === targetId) return { ok: false as const, error: "Vous ne pouvez pas vous suivre." };

  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("follows").select("follower_id")
    .eq("follower_id", user.id).eq("following_id", targetId).maybeSingle();

  if (existing) {
    await admin.from("follows").delete().eq("follower_id", user.id).eq("following_id", targetId);
  } else {
    const { error } = await admin.from("follows").insert({ follower_id: user.id, following_id: targetId });
    if (error) return { ok: false as const, error: error.message };
  }

  const { count } = await admin
    .from("follows").select("*", { count: "exact", head: true }).eq("following_id", targetId);

  revalidatePath(`/communaute/u/${targetId}`);
  return { ok: true as const, following: !existing, followers: count ?? 0 };
}

/** Charge les commentaires d'un post (panneau commentaires du feed). */
export async function getPostComments(postId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Non authentifié.", comments: [] };

  const admin = createAdminClient();
  const { data } = await admin
    .from("comments")
    .select("id, content, created_at, author_id, author:users(id, nom, avatar_url, role)")
    .eq("post_id", postId)
    .order("created_at", { ascending: true })
    .limit(200);

  const comments = (data ?? []).map((c: any) => ({
    id: c.id,
    content: c.content,
    created_at: c.created_at,
    author_id: c.author_id,
    author: {
      id: c.author?.id,
      nom: c.author?.nom ?? "Utilisateur",
      avatar_url: c.author?.avatar_url ?? null,
      role: c.author?.role ?? "eleve",
    },
  }));
  return { ok: true as const, comments };
}
