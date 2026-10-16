import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface CoursEnCours { lessonId: string; lecon: string; cours: string }

/**
 * Le cours « en cours » d'une élève (bouton flottant « Mon cours ») :
 * la DERNIÈRE leçon qu'elle a ouverte (journal d'activité), sinon la première leçon de sa formation la plus récente.
 * null : aucune formation (le bouton n'apparaît pas). Lecture seule, jamais bloquant.
 */
export async function coursEnCours(admin: SupabaseClient, userId: string): Promise<CoursEnCours | null> {
  try {
    const { data: vue } = await admin.from("activity_log").select("meta, created_at")
      .eq("user_id", userId).eq("action", "course_view").order("created_at", { ascending: false }).limit(1);
    const meta = ((vue ?? [])[0] as { meta?: { lessonId?: string; lessonTitre?: string; courseTitre?: string } } | undefined)?.meta;
    if (meta?.lessonId && /^[0-9a-f-]{36}$/i.test(meta.lessonId)) {
      return { lessonId: meta.lessonId, lecon: meta.lessonTitre ?? "Leçon", cours: meta.courseTitre ?? "Mon cours" };
    }
    // Jamais ouvert de leçon : la première leçon de sa formation la plus récente.
    const { data: ins } = await admin.from("enrollments")
      .select("course:courses(titre_fr, chapters(ordre, lessons(id, titre, ordre)))")
      .eq("user_id", userId).order("paid_at", { ascending: false }).limit(1);
    type Cours = { titre_fr: string | null; chapters: { ordre: number | null; lessons: { id: string; titre: string | null; ordre: number | null }[] | null }[] | null };
    const brut = ((ins ?? [])[0] as { course?: Cours | Cours[] | null } | undefined)?.course;
    const c = Array.isArray(brut) ? brut[0] : brut;
    if (!c) return null;
    const chapitres = [...(c.chapters ?? [])].sort((a, b) => (a.ordre ?? 0) - (b.ordre ?? 0));
    for (const ch of chapitres) {
      const l = [...(ch.lessons ?? [])].sort((a, b) => (a.ordre ?? 0) - (b.ordre ?? 0))[0];
      if (l) return { lessonId: l.id, lecon: l.titre ?? "Leçon", cours: c.titre_fr ?? "Mon cours" };
    }
    return null;
  } catch {
    return null;
  }
}
