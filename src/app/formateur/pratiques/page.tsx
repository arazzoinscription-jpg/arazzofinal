import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ReviewCard, type PracticalRow } from "./review-card";

export const metadata = { title: "Travaux pratiques — Arazzo Formation" };
export const dynamic = "force-dynamic";

export default async function PratiquesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single();
  if (profile?.role !== "formateur" && profile?.role !== "admin") redirect("/dashboard");
  const isAdmin = profile?.role === "admin";

  const admin = createAdminClient();

  // 1) Travaux non validés (volume réduit). Le filtre par propriétaire du cours se
  // fait ensuite en JS (les .in() ci-dessous portent seulement sur les leçons ayant
  // une soumission, donc petits — pas de risque d'URL trop longue / HTTP 400).
  const { data: subs } = await admin
    .from("lesson_practicals")
    .select("id, photo_url, video_url, note, feedback, status, created_at, lesson_id, student:users(nom)")
    .neq("status", "approved")
    .order("created_at", { ascending: true });

  // 2) Leçon → cours → formateur, uniquement pour les leçons concernées.
  const lessonTitle = new Map<string, string>();
  const lessonCourse = new Map<string, string>();
  const courseTitle = new Map<string, string>();
  const courseFormateur = new Map<string, string | null>();
  const lessonIds = [...new Set((subs ?? []).map((s: any) => s.lesson_id).filter(Boolean))];
  if (lessonIds.length) {
    const { data: lessons } = await admin
      .from("lessons").select("id, titre, chapter_id").in("id", lessonIds);
    const chapterIds = [...new Set((lessons ?? []).map((l: any) => l.chapter_id).filter(Boolean))];
    const chapterCourse = new Map<string, string>();
    if (chapterIds.length) {
      const { data: chapters } = await admin
        .from("chapters").select("id, course_id").in("id", chapterIds);
      for (const ch of chapters ?? []) chapterCourse.set(ch.id, ch.course_id);
      const courseIds = [...new Set((chapters ?? []).map((c: any) => c.course_id).filter(Boolean))];
      if (courseIds.length) {
        const { data: courses } = await admin
          .from("courses").select("id, titre_fr, formateur_id").in("id", courseIds);
        for (const c of courses ?? []) { courseTitle.set(c.id, c.titre_fr ?? "Formation"); courseFormateur.set(c.id, c.formateur_id ?? null); }
      }
    }
    for (const l of lessons ?? []) {
      lessonTitle.set(l.id, l.titre ?? "Leçon");
      const cid = chapterCourse.get(l.chapter_id);
      if (cid) lessonCourse.set(l.id, cid);
    }
  }

  // Chaque formateur ne voit QUE les travaux des cours dont il est le propriétaire.
  // L'admin voit tout.
  const visible = (subs ?? []).filter((s: any) => {
    if (isAdmin) return true;
    return courseFormateur.get(lessonCourse.get(s.lesson_id) ?? "") === user.id;
  });

  const rows: PracticalRow[] = visible.map((s: any) => ({
    id: s.id,
    photo_url: s.photo_url,
    video_url: s.video_url,
    note: s.note,
    feedback: s.feedback,
    created_at: s.created_at,
    status: s.status,
    studentName: s.student?.nom ?? "Élève",
    lessonTitle: lessonTitle.get(s.lesson_id) ?? "Leçon",
    courseTitle: courseTitle.get(lessonCourse.get(s.lesson_id) ?? "") ?? "",
  }));

  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <h1 className="font-playfair text-3xl font-bold text-gray-900 dark:text-white">Travaux pratiques</h1>
        <p className="text-gray-500 dark:text-white/50 mt-1 font-dm">
          Corrigez les réalisations de vos élèves : laissez un retour, validez ou demandez à retravailler.
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-white/[0.04] rounded-2xl border border-cream-200 dark:border-white/10">
          <div className="text-5xl mb-3">🪡</div>
          <p className="text-gray-400 font-dm">Aucun travail en attente de correction.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {rows.map((r) => <ReviewCard key={r.id} row={r} />)}
        </div>
      )}
    </div>
  );
}
