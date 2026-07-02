"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sanitizeText } from "@/lib/security/sanitize";
import { uploadPracticalFile as bunnyUpload, isPracticalsConfigured } from "@/lib/bunny/practicals-storage";
import { MAX_PRACTICAL_PHOTOS, MAX_PRACTICAL_VIDEOS } from "@/lib/practicals-limits";

async function ctx() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: prof } = await supabase.from("users").select("role").eq("id", user.id).single();
  const role = prof?.role ?? "eleve";
  return { user, role, isStaff: role === "formateur" || role === "admin" };
}

async function lessonCourse(admin: ReturnType<typeof createAdminClient>, lessonId: string) {
  const { data } = await admin
    .from("lessons").select("id, is_preview, chapter:chapters(course_id)").eq("id", lessonId).maybeSingle();
  if (!data) return null;
  return { courseId: (data.chapter as any)?.course_id as string | undefined, isPreview: !!data.is_preview };
}

async function hasAccess(admin: ReturnType<typeof createAdminClient>, userId: string, isStaff: boolean, lessonId: string) {
  const lc = await lessonCourse(admin, lessonId);
  if (!lc) return false;
  if (isStaff || lc.isPreview) return true;
  const { data: enr } = await admin
    .from("enrollments").select("id").eq("user_id", userId).eq("course_id", lc.courseId).maybeSingle();
  return !!enr;
}

/** Pose une question (ou répond si parentId). */
export async function askQuestion(lessonId: string, content: string, parentId?: string | null) {
  const c = await ctx();
  if (!c) return { ok: false, error: "Non authentifié." };
  const text = sanitizeText(content).slice(0, 1000);
  if (text.length < 2) return { ok: false, error: "Message trop court." };

  const admin = createAdminClient();
  if (!(await hasAccess(admin, c.user.id, c.isStaff, lessonId))) return { ok: false, error: "Accès refusé." };

  const { error } = await admin.from("lesson_questions").insert({
    lesson_id: lessonId, user_id: c.user.id, content: text, parent_id: parentId ?? null,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/dashboard/cours/${lessonId}`);
  return { ok: true };
}

/** Supprime une question/réponse (auteur ou staff). */
export async function deleteQuestion(id: string) {
  const c = await ctx();
  if (!c) return { ok: false, error: "Non authentifié." };
  const admin = createAdminClient();
  const { data: q } = await admin.from("lesson_questions").select("user_id, lesson_id").eq("id", id).maybeSingle();
  if (!q) return { ok: false, error: "Introuvable." };
  if (q.user_id !== c.user.id && !c.isStaff) return { ok: false, error: "Accès refusé." };
  await admin.from("lesson_questions").delete().eq("id", id);
  revalidatePath(`/dashboard/cours/${q.lesson_id}`);
  return { ok: true };
}

/**
 * Upload un fichier (photo ou vidéo) vers Bunny Storage "travaux-pratiques".
 * Appelé depuis le composant client via FormData pour garder la clé API côté serveur.
 */
export async function uploadPracticalToBunny(formData: FormData) {
  const c = await ctx();
  if (!c) return { ok: false as const, error: "Non authentifié." };
  if (!isPracticalsConfigured()) return { ok: false as const, error: "Stockage Bunny non configuré." };

  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) return { ok: false as const, error: "Fichier manquant." };

  const lessonId = (formData.get("lessonId") as string | null) ?? "";
  const type = (formData.get("type") as "photo" | "video") ?? "photo";

  const MAX = type === "photo" ? 8 * 1024 * 1024 : 100 * 1024 * 1024;
  if (file.size > MAX) return { ok: false as const, error: `Fichier trop volumineux (max ${type === "photo" ? "8 Mo" : "100 Mo"}).` };

  const ext = (file.name.split(".").pop() ?? "bin").toLowerCase();
  const path = `${lessonId}/${c.user.id}/${type}-${crypto.randomUUID()}.${ext}`;

  try {
    const buffer = await file.arrayBuffer();
    const url = await bunnyUpload(buffer, path, file.type || "application/octet-stream");
    return { ok: true as const, url };
  } catch (e) {
    return { ok: false as const, error: (e as Error).message };
  }
}

/**
 * Enregistre un travail pratique (URLs déjà obtenues).
 * Filet de sécurité : toute exception inattendue ici ferait planter le rendu
 * (« An error occurred in the Server Components render » digest) au lieu de
 * remonter un message exploitable — donc TOUT est capturé et renvoyé proprement.
 */
export async function recordPractical(lessonId: string, photoUrl: string | null, videoUrl: string | null, note: string | null) {
  try {
    const c = await ctx();
    if (!c) return { ok: false, error: "Non authentifié." };
    if (!photoUrl && !videoUrl && !(note ?? "").trim()) return { ok: false, error: "Ajoutez une photo, une vidéo ou une note." };

    const admin = createAdminClient();
    if (!(await hasAccess(admin, c.user.id, c.isStaff, lessonId))) return { ok: false, error: "Accès refusé." };

    // Limite par leçon pour les élèves : 3 photos et 2 vidéos maximum (le staff n'est pas limité).
    if (!c.isStaff && (photoUrl || videoUrl)) {
      const { data: mine } = await admin
        .from("lesson_practicals")
        .select("photo_url, video_url")
        .eq("lesson_id", lessonId)
        .eq("user_id", c.user.id);
      const photos = (mine ?? []).filter((m: { photo_url: string | null }) => m.photo_url).length;
      const videos = (mine ?? []).filter((m: { video_url: string | null }) => m.video_url).length;
      if (photoUrl && photos >= MAX_PRACTICAL_PHOTOS) return { ok: false, error: `Limite atteinte : ${MAX_PRACTICAL_PHOTOS} photos maximum pour cette leçon.` };
      if (videoUrl && videos >= MAX_PRACTICAL_VIDEOS) return { ok: false, error: `Limite atteinte : ${MAX_PRACTICAL_VIDEOS} vidéos maximum pour cette leçon.` };
    }

    const { error } = await admin.from("lesson_practicals").insert({
      lesson_id: lessonId, user_id: c.user.id, photo_url: photoUrl, video_url: videoUrl, note: sanitizeText(note).slice(0, 1000) || null,
    });
    if (error) return { ok: false, error: error.message };
    revalidatePath(`/dashboard/cours/${lessonId}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: "Erreur inattendue : " + ((e as Error)?.message ?? "réessayez.") };
  }
}

/**
 * Supprime un travail pratique déjà déposé.
 * Autorisé à l'AUTEUR (l'élève, son propre travail) OU au STAFF (formateur/admin).
 * La ligne community_media liée est retirée automatiquement (FK ON DELETE CASCADE).
 */
export async function deletePractical(id: string) {
  const c = await ctx();
  if (!c) return { ok: false, error: "Non authentifié." };
  const admin = createAdminClient();
  const { data: row } = await admin.from("lesson_practicals").select("user_id, lesson_id").eq("id", id).maybeSingle();
  if (!row) return { ok: false, error: "Introuvable." };
  if (row.user_id !== c.user.id && !c.isStaff) return { ok: false, error: "Accès refusé." };

  const { error } = await admin.from("lesson_practicals").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/dashboard/cours/${row.lesson_id}`);
  revalidatePath("/dashboard/pratiques");
  revalidatePath("/formateur/pratiques");
  return { ok: true };
}

/** Retour de la formatrice sur un travail pratique (staff). */
export async function setPracticalFeedback(id: string, feedback: string, status: "reviewed" | "approved") {
  const c = await ctx();
  if (!c || !c.isStaff) return { ok: false, error: "Accès refusé." };
  const admin = createAdminClient();
  const { data: row } = await admin.from("lesson_practicals").select("lesson_id, user_id").eq("id", id).maybeSingle();
  const { error } = await admin
    .from("lesson_practicals")
    .update({ feedback: (feedback ?? "").trim() || null, status })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  // Progression diplôme : à l'approbation, notifs d'encouragement + éligibilité (best-effort).
  if (status === "approved" && row?.user_id && row?.lesson_id) {
    try {
      const { handleApprovalProgress } = await import("@/lib/diplomas");
      await handleApprovalProgress(admin, row.user_id as string, row.lesson_id as string);
    } catch { /* ne bloque jamais l'approbation */ }
  }

  if (row) revalidatePath(`/dashboard/cours/${row.lesson_id}`);
  revalidatePath("/formateur/pratiques");
  return { ok: true };
}
