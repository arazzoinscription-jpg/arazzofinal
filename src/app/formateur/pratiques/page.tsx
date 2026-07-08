import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isFormateur, isAdmin as hasAdminRole } from "@/lib/roles";
import { createAdminClient } from "@/lib/supabase/admin";
import { type PracticalRow } from "./review-card";
import { PracticalsBoard } from "./practicals-board";

export const metadata = { title: "Travaux pratiques — Arazzo Formation" };
export const dynamic = "force-dynamic";

export default async function PratiquesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("users").select("role, roles").eq("id", user.id).single();
  if (!isFormateur(profile)) redirect("/dashboard");
  const isAdmin = hasAdminRole(profile);

  const admin = createAdminClient();

  // 1) Travaux à corriger (submitted/reviewed) + travaux déjà validés (approved, récents).
  //    Les validés RESTENT visibles afin de pouvoir les partager sur le feed à tout moment.
  const { data: pendingSubs } = await admin
    .from("lesson_practicals")
    .select("id, photo_url, video_url, annotation_url, note, feedback, status, created_at, lesson_id, student:users(nom)")
    .in("status", ["submitted", "reviewed"])
    .order("created_at", { ascending: true });
  const { data: approvedSubs } = await admin
    .from("lesson_practicals")
    .select("id, photo_url, video_url, annotation_url, note, feedback, status, created_at, lesson_id, student:users(nom)")
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .limit(120);
  const subs = [...(pendingSubs ?? []), ...(approvedSubs ?? [])];

  // 2) Leçon → cours → formateur, uniquement pour les leçons concernées.
  const lessonTitle = new Map<string, string>();
  const lessonCourse = new Map<string, string>();
  const courseTitle = new Map<string, string>();
  const courseFormateur = new Map<string, string | null>();
  const lessonIds = [...new Set(subs.map((s: any) => s.lesson_id).filter(Boolean))];
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

  // Chaque formateur ne voit QUE les travaux des cours dont il est le propriétaire ; l'admin voit tout.
  const owns = (s: any) => isAdmin || courseFormateur.get(lessonCourse.get(s.lesson_id) ?? "") === user.id;

  // 3) Travaux déjà publiés sur le feed (pour l'état « Publié » du bouton de partage).
  const sharedSet = new Set<string>();
  const approvedIds = (approvedSubs ?? []).filter(owns).map((s: any) => s.id);
  if (approvedIds.length) {
    const { data: cm } = await admin.from("community_media").select("practical_id").in("practical_id", approvedIds);
    (cm ?? []).forEach((m: { practical_id: string | null }) => m.practical_id && sharedSet.add(m.practical_id));
  }

  const toRow = (s: any): PracticalRow => ({
    id: s.id,
    photo_url: s.photo_url,
    video_url: s.video_url,
    annotation_url: s.annotation_url ?? null,
    note: s.note,
    feedback: s.feedback,
    created_at: s.created_at,
    status: s.status,
    studentName: s.student?.nom ?? "Élève",
    lessonTitle: lessonTitle.get(s.lesson_id) ?? "Leçon",
    courseTitle: courseTitle.get(lessonCourse.get(s.lesson_id) ?? "") ?? "",
  });

  const pendingRows = (pendingSubs ?? []).filter(owns).map(toRow);
  const approvedRows = (approvedSubs ?? []).filter(owns).map(toRow);

  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <h1 className="font-playfair text-3xl font-bold text-gray-900 dark:text-white">Travaux pratiques</h1>
        <p className="text-gray-500 dark:text-white/50 mt-1 font-dm">
          Corrigez les réalisations de vos élèves : laissez un retour, validez ou demandez à retravailler.
        </p>
      </div>

      {/* Sélection multiple + suppression en masse (client) */}
      <PracticalsBoard pending={pendingRows} approved={approvedRows} sharedIds={[...sharedSet]} />
    </div>
  );
}
