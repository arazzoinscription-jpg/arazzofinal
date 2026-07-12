"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createBunnyVideo, bunnyTusAuth, bunnyPlaybackUrls } from "@/lib/bunny/stream";
import { isFacebookVideoUrl } from "@/lib/community-types";

type Source = "admin" | "course_teaser" | "patron_demo" | "student_reel";

// Durée maximale d'un reel élève : 2 minutes.
const STUDENT_REEL_MAX_SECONDS = 120;

/**
 * Autorise la publication selon la source :
 *  - admin          → rôle admin
 *  - course_teaser  → admin OU formateur propriétaire du cours (courses.formateur_id)
 *  - patron_demo    → admin OU propriétaire du patron (patrons.formateur_id)
 *  - student_reel   → tout membre connecté (élève inclus) — reel ≤ 2 min
 */
async function authorize(source: Source, courseId: string | null, patronId: string | null) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Non authentifié." };

  const admin = createAdminClient();
  const { data: prof } = await admin.from("users").select("role").eq("id", user.id).single();
  const isAdmin = (prof?.role ?? "eleve") === "admin";

  if (source === "student_reel") {
    // Ouvert à tout membre connecté : aucune vérification de rôle supplémentaire.
  } else if (source === "admin") {
    if (!isAdmin) return { ok: false as const, error: "Réservé à l'administration." };
  } else if (source === "course_teaser") {
    if (!courseId) return { ok: false as const, error: "Cours manquant." };
    const { data: c } = await admin.from("courses").select("formateur_id").eq("id", courseId).maybeSingle();
    if (!c) return { ok: false as const, error: "Cours introuvable." };
    if (!isAdmin && c.formateur_id !== user.id) return { ok: false as const, error: "Vous n'êtes pas le formateur de ce cours." };
  } else if (source === "patron_demo") {
    if (!patronId) return { ok: false as const, error: "Patron manquant." };
    const { data: pat } = await admin.from("patrons").select("formateur_id").eq("id", patronId).maybeSingle();
    if (!pat) return { ok: false as const, error: "Patron introuvable." };
    if (!isAdmin && pat.formateur_id !== user.id) return { ok: false as const, error: "Vous n'êtes pas le propriétaire de ce patron." };
  }
  return { ok: true as const, userId: user.id };
}

const StartSchema = z.object({
  sourceType: z.enum(["admin", "course_teaser", "patron_demo", "student_reel"]),
  courseId: z.string().uuid().nullable().optional(),
  patronId: z.string().uuid().nullable().optional(),
  title: z.string().max(120).optional(),
});

/** Crée l'objet vidéo Bunny + renvoie la signature TUS pour l'upload navigateur. */
export async function startCommunityVideo(input: unknown) {
  const parsed = StartSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Paramètres invalides." };
  const { sourceType, courseId = null, patronId = null, title } = parsed.data;

  const auth = await authorize(sourceType, courseId ?? null, patronId ?? null);
  if (!auth.ok) return auth;

  const created = await createBunnyVideo(title || "Vidéo communauté");
  if (!created.ok) return { ok: false as const, error: created.error };

  return { ok: true as const, videoId: created.videoId, tus: bunnyTusAuth(created.videoId) };
}

const FinalizeSchema = z.object({
  videoId: z.string().min(8),
  sourceType: z.enum(["admin", "course_teaser", "patron_demo", "student_reel"]),
  caption: z.string().max(500).optional(),
  durationSeconds: z.number().int().min(1).max(180),
  courseId: z.string().uuid().nullable().optional(),
  patronId: z.string().uuid().nullable().optional(),
});

/** Une fois l'upload Bunny terminé : crée le post + community_media. */
export async function finalizeCommunityVideo(input: unknown) {
  const parsed = FinalizeSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Paramètres invalides." };
  const { videoId, sourceType, caption, durationSeconds, courseId = null, patronId = null } = parsed.data;

  // Reel élève : durée plafonnée à 2 minutes.
  if (sourceType === "student_reel" && durationSeconds > STUDENT_REEL_MAX_SECONDS) {
    return { ok: false as const, error: "Le reel ne doit pas dépasser 2 minutes (120s)." };
  }

  const auth = await authorize(sourceType, courseId ?? null, patronId ?? null);
  if (!auth.ok) return auth;

  const admin = createAdminClient();
  const { thumbnail } = bunnyPlaybackUrls(videoId);

  const { data: post, error: postErr } = await admin
    .from("posts")
    .insert({ author_id: auth.userId, group_id: null, content: caption?.trim() || null, published: true })
    .select("id")
    .single();
  if (postErr || !post) return { ok: false as const, error: "Publication impossible." };

  const { error: cmErr } = await admin.from("community_media").insert({
    post_id: post.id,
    source_type: sourceType,
    media_kind: "video",
    bunny_video_id: videoId,
    duration_seconds: durationSeconds,
    thumbnail_url: thumbnail,
    course_id: sourceType === "course_teaser" ? courseId : null,
    patron_id: sourceType === "patron_demo" ? patronId : null,
    status: "ready",
  });
  if (cmErr) {
    await admin.from("posts").delete().eq("id", post.id);
    return { ok: false as const, error: cmErr.message };
  }

  revalidatePath("/communaute");
  return { ok: true as const };
}

const FacebookSchema = z.object({
  url: z.string().trim().url("Lien invalide.").max(500),
  caption: z.string().trim().max(500).optional(),
});

/**
 * Partage une vidéo Facebook dans le feed — SANS téléchargement ni réupload.
 * On enregistre juste l'URL (lecteur Facebook intégré au rendu). Ouvert à tout
 * membre connecté ; l'admin peut masquer/supprimer ensuite (togglePostPublished/deletePost).
 * La vidéo doit être PUBLIQUE pour être lisible par les autres.
 */
export async function addFacebookVideo(input: unknown) {
  const parsed = FacebookSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0].message };
  const url = parsed.data.url;
  if (!url.startsWith("https://") || !isFacebookVideoUrl(url)) {
    return { ok: false as const, error: "Collez le lien d'une vidéo Facebook (facebook.com ou fb.watch)." };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Connectez-vous pour partager une vidéo." };

  const admin = createAdminClient();
  const { data: post, error: postErr } = await admin
    .from("posts")
    .insert({ author_id: user.id, group_id: null, content: parsed.data.caption?.trim() || null, published: true })
    .select("id")
    .single();
  if (postErr || !post) return { ok: false as const, error: "Publication impossible." };

  // source_type contraint (admin/course_teaser/practical/patron_demo) → on stocke 'admin' ;
  // le type « facebook » est déduit de l'URL au rendu (mapRow). media_url porte le lien FB.
  const { error: cmErr } = await admin.from("community_media").insert({
    post_id: post.id,
    source_type: "admin",
    media_kind: "video",
    media_url: url,
    bunny_video_id: null,
    status: "ready",
  });
  if (cmErr) {
    await admin.from("posts").delete().eq("id", post.id);
    return { ok: false as const, error: cmErr.message };
  }

  revalidatePath("/communaute");
  return { ok: true as const };
}
