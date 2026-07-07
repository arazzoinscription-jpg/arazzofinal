import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { CourseEditForm, type EditableCourse } from "./course-edit-form";
import { CourseCategoryEditor } from "../category-editor";
import { HomeworkAtelierEditor } from "./homework-atelier-editor";
import { CommunityVideoUploader } from "@/components/community/video-uploader";
import { CourseContentEditor, type EditChapter } from "./course-content-editor";

export const metadata = { title: "Modifier le cours — Arazzo Formation" };
export const dynamic = "force-dynamic";

export default async function EditCoursePage({ params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: prof } = await supabase.from("users").select("role").eq("id", user.id).single();
  const isAdmin = prof?.role === "admin";

  const admin = createAdminClient();
  const { data: course } = await admin
    .from("courses")
    .select("id, titre_fr, titre_ar, titre_en, description_fr, description_ar, description_en, niveau, duree, prix_dzd, prix_eur, thumbnail, published, formateur_id")
    .eq("id", params.id)
    .single();

  if (!course) notFound();

  // Autorisation : propriétaire, admin, OU cours importé/non assigné (formateur_id NULL).
  // Les cours importés depuis TutorLMS n'ont pas de propriétaire → tout formateur peut les éditer.
  const isOwnerOrFree = course.formateur_id === user.id || course.formateur_id === null;
  if (!isOwnerOrFree && !isAdmin) redirect("/formateur");

  const { data: cc } = await admin.from("course_categories").select("category_id").eq("course_id", course.id);
  const initialCats = (cc ?? []).map((r) => r.category_id);

  // Chapitres + leçons existants (pour l'éditeur de contenu).
  const { data: chapterRows } = await admin
    .from("chapters")
    .select("id, titre, ordre, lessons(id, titre, video_url_bunny, duree_minutes, ordre, is_preview)")
    .eq("course_id", course.id)
    .order("ordre", { ascending: true });

  // Lecture résiliente du « devoir » par leçon (colonne ajoutée par la migration 046).
  // Si la colonne n'existe pas encore, la requête échoue silencieusement → devoir vide.
  const devoirByLesson = new Map<string, string>();
  const mandatoryByLesson = new Set<string>();
  const allLessonIds = (chapterRows ?? []).flatMap((ch: any) => ((ch.lessons as any[]) ?? []).map((l) => l.id));
  if (allLessonIds.length) {
    const { data: devoirs } = await admin.from("lessons").select("id, devoir, devoir_obligatoire").in("id", allLessonIds);
    for (const d of (devoirs as { id: string; devoir?: string | null; devoir_obligatoire?: boolean | null }[] | null) ?? []) {
      if (d.devoir) devoirByLesson.set(d.id, d.devoir);
      if (d.devoir_obligatoire) mandatoryByLesson.add(d.id);
    }
  }

  // Lecture résiliente du « mois d'ouverture » par chapitre (colonne migration 053).
  const unlockByChapter = new Map<string, string>();
  const chapterIds = (chapterRows ?? []).map((ch: any) => ch.id);
  if (chapterIds.length) {
    const { data: um } = await admin.from("chapters").select("id, unlock_month").in("id", chapterIds);
    for (const c of (um as { id: string; unlock_month?: number | null }[] | null) ?? []) {
      if (c.unlock_month != null) unlockByChapter.set(c.id, String(c.unlock_month));
    }
  }

  const initialChapters: EditChapter[] = (chapterRows ?? []).map((ch: any) => ({
    id: ch.id,
    titre: ch.titre ?? "",
    unlockMonth: unlockByChapter.get(ch.id) ?? "",
    lessons: ((ch.lessons as any[]) ?? [])
      .sort((a, b) => (a.ordre ?? 0) - (b.ordre ?? 0))
      .map((l) => ({
        id: l.id,
        titre: l.titre ?? "",
        video_url_bunny: l.video_url_bunny ?? "",
        devoir: devoirByLesson.get(l.id) ?? "",
        devoir_obligatoire: mandatoryByLesson.has(l.id),
        duree_minutes: l.duree_minutes != null ? String(l.duree_minutes) : "",
        is_preview: !!l.is_preview,
      })),
  }));

  // Lecture résiliente des colonnes de la migration 027 (devoir + atelier).
  // Si la migration n'est pas encore appliquée, la requête échoue silencieusement → valeurs par défaut.
  const { data: extra } = await admin.from("courses").select("homework, atelier_required").eq("id", course.id).maybeSingle();
  const homework = ((extra as { homework?: string | null } | null)?.homework) ?? "";
  const atelierRequired = !!((extra as { atelier_required?: boolean } | null)?.atelier_required);

  const backHref = isAdmin ? "/admin/formations" : "/formateur";

  return (
    <div className="max-w-3xl">
      <h1 className="font-playfair text-3xl font-bold text-gray-900 mb-2">Modifier le cours</h1>
      <p className="text-gray-500 mb-8 font-dm">
        Mettez à jour les informations de « {course.titre_fr} ».
      </p>
      <CourseEditForm course={course as EditableCourse} backHref={backHref} />
      <CourseContentEditor courseId={course.id} initial={initialChapters} />
      <CourseCategoryEditor courseId={course.id} initial={initialCats} />
      <HomeworkAtelierEditor courseId={course.id} initialHomework={homework} initialAtelierRequired={atelierRequired} />

      {/* Teaser communauté : courte vidéo éducative → feed + CTA « S'inscrire au cours ». */}
      <div className="mt-8">
        <h2 className="font-playfair text-xl font-bold text-gray-900 mb-1">Teaser communauté</h2>
        <p className="text-sm text-gray-500 mb-4 font-dm">
          Publiez une courte vidéo (max 3 min) sur le feed communauté pour attirer des élèves vers cette formation. Un bouton « S'inscrire au cours complet » sera ajouté automatiquement.
        </p>
        <CommunityVideoUploader sourceType="course_teaser" courseId={course.id} />
      </div>
    </div>
  );
}
