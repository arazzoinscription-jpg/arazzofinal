"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isFormateur, isAdmin } from "@/lib/roles";

/**
 * Édition du contenu d'un cours (chapitres + leçons) par le formateur.
 *
 * Autorisation : staff (formateur/admin). Un formateur peut éditer SON cours,
 * un cours importé (formateur_id NULL), ou n'importe quel cours s'il est admin.
 * On passe par le client ADMIN car la RLS bloque l'écriture sur un cours non possédé
 * (ex. cours importés) — l'autorisation est vérifiée explicitement côté serveur.
 *
 * Réconciliation préservant les IDs : on met à jour les chapitres/leçons existants,
 * on insère les nouveaux et on supprime UNIQUEMENT ce que le formateur a retiré.
 * Crucial : supprimer une leçon casse en cascade `lesson_progress` / `lesson_practicals`,
 * donc on ne supprime jamais une leçon conservée.
 */

const LessonInput = z.object({
  id: z.string().uuid().nullable().optional(),
  titre: z.string().trim().min(1, "Titre de leçon requis."),
  video_url_bunny: z.string().trim().default(""),
  devoir: z.string().trim().max(5000).default(""),
  devoir_obligatoire: z.boolean().default(false),
  duree_minutes: z.number().int().min(0).nullable().optional(),
  is_preview: z.boolean().default(false),
});
const ChapterInput = z.object({
  id: z.string().uuid().nullable().optional(),
  titre: z.string().trim().min(1, "Titre de chapitre requis."),
  unlock_month: z.number().int().min(1).max(24).nullable().optional(),
  lessons: z.array(LessonInput),
});
const ContentSchema = z.object({
  courseId: z.string().uuid(),
  chapters: z.array(ChapterInput),
});

export type SaveCourseContentInput = z.infer<typeof ContentSchema>;

/** Autorise et renvoie le client admin si OK. */
async function authorizeCourse(courseId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Non authentifié." };

  const { data: prof } = await supabase.from("users").select("role, roles").eq("id", user.id).single();
  if (!isFormateur(prof)) return { ok: false as const, error: "Accès refusé." };

  const admin = createAdminClient();
  const { data: course } = await admin.from("courses").select("id, formateur_id").eq("id", courseId).single();
  if (!course) return { ok: false as const, error: "Cours introuvable." };

  const allowed = isAdmin(prof) || course.formateur_id === user.id || course.formateur_id === null;
  if (!allowed) return { ok: false as const, error: "Ce cours appartient à un autre formateur." };

  return { ok: true as const, admin, userId: user.id };
}

export async function saveCourseContent(input: SaveCourseContentInput) {
  const parsed = ContentSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0].message };
  const { courseId, chapters } = parsed.data;

  const auth = await authorizeCourse(courseId);
  if (!auth.ok) return auth;
  const { admin } = auth;

  // Chapitres existants
  const { data: existingChapters } = await admin.from("chapters").select("id").eq("course_id", courseId);
  const existingChapterIds = new Set((existingChapters ?? []).map((c) => c.id as string));
  const keptChapterIds = new Set(chapters.map((c) => c.id).filter(Boolean) as string[]);

  // Supprimer les chapitres retirés (cascade leçons)
  const chaptersToDelete = [...existingChapterIds].filter((id) => !keptChapterIds.has(id));
  if (chaptersToDelete.length) {
    const { error } = await admin.from("chapters").delete().in("id", chaptersToDelete);
    if (error) return { ok: false as const, error: error.message };
  }

  for (let ci = 0; ci < chapters.length; ci++) {
    const ch = chapters[ci];
    let chapterId = ch.id ?? null;

    if (chapterId && existingChapterIds.has(chapterId)) {
      const { error } = await admin.from("chapters").update({ titre: ch.titre, ordre: ci + 1 }).eq("id", chapterId);
      if (error) return { ok: false as const, error: error.message };
    } else {
      const { data: created, error } = await admin
        .from("chapters").insert({ course_id: courseId, titre: ch.titre, ordre: ci + 1 }).select("id").single();
      if (error || !created) return { ok: false as const, error: error?.message ?? "Création du chapitre échouée." };
      chapterId = created.id as string;
    }

    // Mois d'ouverture personnalisé (colonne migration 053) — écriture RÉSILIENTE :
    // si la colonne n'existe pas encore, on ignore l'erreur (le reste est sauvé).
    if (chapterId) {
      await admin.from("chapters").update({ unlock_month: ch.unlock_month ?? null }).eq("id", chapterId);
    }

    // Leçons existantes de ce chapitre
    const { data: existingLessons } = await admin.from("lessons").select("id").eq("chapter_id", chapterId);
    const existingLessonIds = new Set((existingLessons ?? []).map((l) => l.id as string));
    const keptLessonIds = new Set(ch.lessons.map((l) => l.id).filter(Boolean) as string[]);

    const lessonsToDelete = [...existingLessonIds].filter((id) => !keptLessonIds.has(id));
    if (lessonsToDelete.length) {
      const { error } = await admin.from("lessons").delete().in("id", lessonsToDelete);
      if (error) return { ok: false as const, error: error.message };
    }

    for (let li = 0; li < ch.lessons.length; li++) {
      const l = ch.lessons[li];
      const payload = {
        titre: l.titre,
        video_url_bunny: l.video_url_bunny || null,
        duree_minutes: l.duree_minutes ?? null,
        ordre: li + 1,
        is_preview: l.is_preview,
      };
      let lessonId = l.id ?? null;
      if (l.id && existingLessonIds.has(l.id)) {
        const { error } = await admin.from("lessons").update(payload).eq("id", l.id);
        if (error) return { ok: false as const, error: error.message };
      } else {
        const { data: created, error } = await admin
          .from("lessons").insert({ chapter_id: chapterId, ...payload }).select("id").single();
        if (error) return { ok: false as const, error: error.message };
        lessonId = (created as { id: string } | null)?.id ?? null;
      }
      // « Devoir à faire » de la leçon — deux écritures SÉPARÉES et résilientes :
      //  • devoir (texte, migration 046)
      //  • devoir_obligatoire (booléen, migration 062)
      // Les séparer garantit que le texte du devoir est enregistré même si la
      // colonne `devoir_obligatoire` n'existe pas encore (sinon l'UPDATE combiné
      // échouait EN ENTIER → ni le texte ni le flag n'étaient sauvés).
      if (lessonId) {
        await admin.from("lessons").update({ devoir: l.devoir || null }).eq("id", lessonId);
        const { error: obligErr } = await admin
          .from("lessons").update({ devoir_obligatoire: !!l.devoir_obligatoire }).eq("id", lessonId);
        if (obligErr && /devoir_obligatoire/.test(obligErr.message)) {
          // Colonne absente (migration 062 non appliquée) → on signale clairement.
          return { ok: false as const, error: "La colonne « devoir_obligatoire » n'existe pas encore : appliquez la migration 062 (voir _APPLIQUER_MIGRATIONS.sql) pour activer « Obligatoire pour le diplôme »." };
        }
      }
    }
  }

  revalidatePath(`/formateur/cours/${courseId}/edit`);
  revalidatePath(`/dashboard/cours/${courseId}`);
  return { ok: true as const };
}
