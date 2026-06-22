"use server";

import { createClient } from "@/lib/supabase/server";
import { createCourseVideo, courseTusAuth, courseEmbedUrl } from "@/lib/bunny/courses";

/**
 * Démarre l'upload d'une vidéo de leçon vers la library Bunny « cours ».
 * Réservé au staff (formateur/admin). Renvoie l'objet vidéo + la signature TUS
 * + l'URL d'embed finale (à stocker dans lessons.video_url_bunny).
 */
export async function startLessonVideo(title: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Non authentifié." };

  const { data: prof } = await supabase.from("users").select("role").eq("id", user.id).single();
  const role = prof?.role ?? "eleve";
  if (role !== "formateur" && role !== "admin") return { ok: false as const, error: "Accès refusé." };

  const created = await createCourseVideo(title);
  if (!created.ok) return { ok: false as const, error: created.error };

  return {
    ok: true as const,
    videoId: created.videoId,
    embedUrl: courseEmbedUrl(created.videoId),
    tus: courseTusAuth(created.videoId),
  };
}
