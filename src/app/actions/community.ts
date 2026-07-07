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

/**
 * Partage staff : l'ADMIN ou le FORMATEUR du cours publie un travail pratique
 * VALIDÉ sur le feed (auteur = l'élève). Permet à l'admin de mettre en avant
 * les meilleures réalisations.
 */
export async function sharePracticalToFeedAsStaff(practicalId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Non authentifié." };

  const admin = createAdminClient();
  const { data: prof } = await admin.from("users").select("role").eq("id", user.id).maybeSingle();
  const isAdmin = prof?.role === "admin";

  const { data: prac } = await admin
    .from("lesson_practicals")
    .select("id, user_id, status, photo_url, video_url, note, lesson:lessons(chapter:chapters(course_id))")
    .eq("id", practicalId)
    .maybeSingle();
  if (!prac) return { ok: false, error: "Travail introuvable." };
  if (prac.status !== "approved") return { ok: false, error: "Validez d'abord ce travail." };

  const courseId = (prac.lesson as any)?.chapter?.course_id ?? null;
  if (!isAdmin) {
    const { data: course } = await admin.from("courses").select("formateur_id").eq("id", courseId).maybeSingle();
    if (!course || course.formateur_id !== user.id) return { ok: false, error: "Réservé à l'admin ou au formateur du cours." };
  }

  const { data: already } = await admin.from("community_media").select("id").eq("practical_id", practicalId).maybeSingle();
  if (already) return { ok: false, error: "Déjà publié sur la communauté." };

  const mediaUrl = prac.video_url || prac.photo_url;
  if (!mediaUrl) return { ok: false, error: "Ce travail n'a ni photo ni vidéo." };
  const mediaKind: "video" | "image" = prac.video_url ? "video" : "image";

  // Auteur = l'élève (c'est son travail).
  const { data: post, error: postErr } = await admin
    .from("posts").insert({ author_id: prac.user_id, group_id: null, content: prac.note ?? null, published: true })
    .select("id").single();
  if (postErr || !post) return { ok: false, error: "Publication impossible." };

  const { error: cmErr } = await admin.from("community_media").insert({
    post_id: post.id, source_type: "practical", media_kind: mediaKind, media_url: mediaUrl,
    thumbnail_url: mediaKind === "image" ? mediaUrl : null, course_id: courseId, practical_id: practicalId, status: "ready",
  });
  if (cmErr) { await admin.from("posts").delete().eq("id", post.id); return { ok: false, error: cmErr.message }; }

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
    // Notifie la personne suivie qu'elle a un nouvel abonné (in-app + push système).
    try {
      const { data: me } = await admin.from("users").select("nom, username").eq("id", user.id).maybeSingle();
      const label = me?.username ? `@${me.username}` : (me?.nom ?? "Un membre");
      // Le push système est envoyé par le webhook /api/webhooks/push (déclenché
      // par cette insertion) → un seul émetteur, aucune duplication.
      await admin.from("notifications").insert({
        user_id: targetId,
        type: "follow",
        title: `${label} suit votre aventure`,
        body: "Vous avez un nouvel abonné dans la communauté.",
        link: `/communaute/u/${user.id}`,
      });
    } catch { /* la notif ne doit jamais bloquer le suivi */ }
  }

  const { count } = await admin
    .from("follows").select("*", { count: "exact", head: true }).eq("following_id", targetId);

  revalidatePath(`/communaute/u/${targetId}`);
  return { ok: true as const, following: !existing, followers: count ?? 0 };
}

// ── Listes « qui suit / qui je suis / qui a aimé » ──────────────────────────

export interface CommunityPerson {
  id: string;
  nom: string | null;
  username: string | null;
  avatar_url: string | null;
  role: string | null;
}

/** Récupère des profils par IDs en conservant l'ordre fourni. */
async function fetchPeopleOrdered(admin: ReturnType<typeof createAdminClient>, ids: string[]): Promise<CommunityPerson[]> {
  if (ids.length === 0) return [];
  const { data } = await admin
    .from("users").select("id, nom, username, avatar_url, role").in("id", ids);
  const byId = new Map((data ?? []).map((u) => [u.id, u as CommunityPerson]));
  return ids.map((id) => byId.get(id)).filter(Boolean) as CommunityPerson[];
}

/** Abonnés de la cible (qui la suit), du plus récent au plus ancien. */
export async function listFollowers(targetId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Non authentifié.", people: [] as CommunityPerson[] };
  const admin = createAdminClient();
  const { data: rows } = await admin
    .from("follows").select("follower_id, created_at")
    .eq("following_id", targetId).order("created_at", { ascending: false }).limit(300);
  const people = await fetchPeopleOrdered(admin, (rows ?? []).map((r) => r.follower_id));
  return { ok: true as const, people };
}

/** Abonnements de la cible (qui elle suit), du plus récent au plus ancien. */
export async function listFollowing(targetId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Non authentifié.", people: [] as CommunityPerson[] };
  const admin = createAdminClient();
  const { data: rows } = await admin
    .from("follows").select("following_id, created_at")
    .eq("follower_id", targetId).order("created_at", { ascending: false }).limit(300);
  const people = await fetchPeopleOrdered(admin, (rows ?? []).map((r) => r.following_id));
  return { ok: true as const, people };
}

/** Membres ayant aimé les publications de la cible (dédupliqués, récents d'abord). */
export async function listProfileLikers(targetId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Non authentifié.", people: [] as CommunityPerson[] };
  const admin = createAdminClient();
  const { data: posts } = await admin.from("posts").select("id").eq("author_id", targetId);
  const postIds = (posts ?? []).map((p) => p.id);
  if (postIds.length === 0) return { ok: true as const, people: [] as CommunityPerson[] };
  const { data: likes } = await admin
    .from("likes").select("user_id, created_at")
    .in("post_id", postIds).order("created_at", { ascending: false }).limit(500);
  // Déduplique en conservant l'ordre de récence, exclut l'auteur lui-même.
  const seen = new Set<string>();
  const ids: string[] = [];
  for (const l of likes ?? []) {
    if (l.user_id === targetId || seen.has(l.user_id)) continue;
    seen.add(l.user_id); ids.push(l.user_id);
    if (ids.length >= 200) break;
  }
  const people = await fetchPeopleOrdered(admin, ids);
  return { ok: true as const, people };
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
