"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

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
  const text = (content ?? "").trim();
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

/** Enregistre un travail pratique (fichiers déjà téléversés vers Storage côté client). */
export async function recordPractical(lessonId: string, photoUrl: string | null, videoUrl: string | null, note: string | null) {
  const c = await ctx();
  if (!c) return { ok: false, error: "Non authentifié." };
  if (!photoUrl && !videoUrl && !(note ?? "").trim()) return { ok: false, error: "Ajoutez une photo, une vidéo ou une note." };

  const admin = createAdminClient();
  if (!(await hasAccess(admin, c.user.id, c.isStaff, lessonId))) return { ok: false, error: "Accès refusé." };

  const { error } = await admin.from("lesson_practicals").insert({
    lesson_id: lessonId, user_id: c.user.id, photo_url: photoUrl, video_url: videoUrl, note: (note ?? "").trim() || null,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/dashboard/cours/${lessonId}`);
  return { ok: true };
}

/** Retour de la formatrice sur un travail pratique (staff). */
export async function setPracticalFeedback(id: string, feedback: string, status: "reviewed" | "approved") {
  const c = await ctx();
  if (!c || !c.isStaff) return { ok: false, error: "Accès refusé." };
  const admin = createAdminClient();
  const { data: row } = await admin.from("lesson_practicals").select("lesson_id").eq("id", id).maybeSingle();
  const { error } = await admin
    .from("lesson_practicals")
    .update({ feedback: (feedback ?? "").trim() || null, status })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  if (row) revalidatePath(`/dashboard/cours/${row.lesson_id}`);
  return { ok: true };
}
