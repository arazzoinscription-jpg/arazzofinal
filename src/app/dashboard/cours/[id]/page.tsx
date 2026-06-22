import { notFound, redirect } from "next/navigation";
import { ClipboardList } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logActivity } from "@/lib/activity";
import { LessonWatch } from "@/components/player/lesson-watch";
import { LessonSidebar } from "./lesson-sidebar";
import { LessonQA, type QA } from "./lesson-qa";
import { LessonPractical, type Practical } from "./lesson-practical";

export default async function LessonPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: lesson } = await supabase
    .from("lessons")
    .select(`
      *,
      chapter:chapters(
        *,
        course:courses(
          id, titre_fr, slug, min_watch_pct,
          chapters(
            id, titre, ordre,
            lessons(id, titre, ordre, duree_minutes, is_preview)
          )
        )
      )
    `)
    .eq("id", params.id)
    .single();

  if (!lesson) notFound();

  const course = (lesson.chapter as any)?.course;

  // Devoir du cours (migration 027) — lecture résiliente : "" si la colonne n'existe pas encore.
  let courseHomework = "";
  if (course?.id) {
    const { data: hw } = await supabase.from("courses").select("homework").eq("id", course.id).maybeSingle();
    courseHomework = ((hw as { homework?: string | null } | null)?.homework) ?? "";
  }

  // Verify enrollment
  const { data: enrollment } = await supabase
    .from("enrollments")
    .select("id")
    .eq("user_id", user.id)
    .eq("course_id", course?.id)
    .single();

  if (!enrollment && !(lesson as any).is_preview) {
    redirect(`/formations/${course?.slug ?? ""}`);
  }

  // Get user progress for this course
  const { data: progressData } = await supabase
    .from("progress")
    .select("lesson_id")
    .eq("user_id", user.id);

  const completedLessons = new Set(progressData?.map((p) => p.lesson_id));

  // Journal d'activité : consultation de leçon (dédoublonné sur 30 min)
  {
    const admin = createAdminClient();
    const { data: recent } = await admin
      .from("activity_log")
      .select("id")
      .eq("user_id", user.id)
      .eq("action", "course_view")
      .gte("created_at", new Date(Date.now() - 30 * 60 * 1000).toISOString())
      .contains("meta", { lessonId: lesson.id })
      .maybeSingle();
    if (!recent) {
      await logActivity(user.id, "course_view", {
        lessonId: lesson.id, lessonTitre: lesson.titre, courseTitre: course?.titre_fr,
      });
    }
  }

  // Progression vidéo sauvegardée (reprise + % regardé)
  const { data: vp } = await supabase
    .from("video_progress")
    .select("last_position_sec, watched_pct")
    .eq("user_id", user.id)
    .eq("lesson_id", lesson.id)
    .maybeSingle();

  // Quiz rattachés à cette leçon (évaluation / pratique)
  const { data: quizzes } = await supabase
    .from("quizzes")
    .select("id, title, type, min_score")
    .eq("lesson_id", lesson.id)
    .order("created_at", { ascending: true });

  // Rôle (staff ?) + Q&R + travaux pratiques
  const { data: meProf } = await supabase.from("users").select("role").eq("id", user.id).single();
  const isStaff = meProf?.role === "formateur" || meProf?.role === "admin";

  const extrasAdmin = createAdminClient();
  const { data: qRows } = await extrasAdmin
    .from("lesson_questions")
    .select("id, content, created_at, user_id, parent_id, author:users(nom, role)")
    .eq("lesson_id", lesson.id)
    .order("created_at", { ascending: true });
  const qa: QA[] = (qRows ?? []).map((q: any) => ({
    id: q.id, content: q.content, created_at: q.created_at, user_id: q.user_id, parent_id: q.parent_id,
    authorName: q.author?.nom ?? "Utilisateur", authorRole: q.author?.role ?? "eleve",
  }));

  let pQuery = extrasAdmin
    .from("lesson_practicals")
    .select("id, user_id, photo_url, video_url, note, feedback, status, created_at, author:users(nom)")
    .eq("lesson_id", lesson.id)
    .order("created_at", { ascending: false });
  if (!isStaff) pQuery = pQuery.eq("user_id", user.id);
  const { data: pRows } = await pQuery;
  const practicals: Practical[] = (pRows ?? []).map((p: any) => ({
    id: p.id, user_id: p.user_id, photo_url: p.photo_url, video_url: p.video_url, note: p.note,
    feedback: p.feedback, status: p.status, created_at: p.created_at, authorName: p.author?.nom ?? "Élève",
  }));

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Lesson player */}
      <div className="flex-1 min-w-0">
        <div className="mb-4">
          <p className="text-sm text-gray-400 mb-1">
            {(lesson.chapter as any)?.course?.titre_fr} · {(lesson.chapter as any)?.titre}
          </p>
          <h1 className="font-playfair text-2xl font-bold text-gray-900">
            {lesson.titre}
          </h1>
        </div>

        <LessonWatch
          lessonId={lesson.id}
          courseId={course?.id}
          videoUrl={lesson.video_url_bunny}
          initialPosition={vp?.last_position_sec ?? 0}
          initialPct={vp?.watched_pct ?? 0}
          minPct={course?.min_watch_pct ?? 80}
          isCompleted={completedLessons.has(lesson.id)}
        />

        {lesson.duree_minutes && (
          <div className="mt-4 text-sm text-gray-400">⏱ {lesson.duree_minutes} minutes</div>
        )}

        {/* Quiz de la leçon */}
        {(quizzes ?? []).length > 0 && (
          <div className="mt-6 space-y-3">
            {(quizzes ?? []).map((q) => (
              <a
                key={q.id}
                href={`/dashboard/quiz/${q.id}`}
                className="flex items-center justify-between gap-4 bg-gradient-to-r from-violet-50 to-blush-50 border border-orange-100 rounded-2xl p-4 hover:shadow-soft transition-all group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-2xl flex-shrink-0">{q.type === "practical" ? "📷" : "📝"}</span>
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 font-dm truncate">{q.title}</p>
                    <p className="text-xs text-gray-500 font-dm">
                      {q.type === "practical"
                        ? "Travail pratique à soumettre · +50 XP"
                        : `Quiz · score minimum ${q.min_score}%`}
                    </p>
                  </div>
                </div>
                <span className="flex-shrink-0 bg-orange-DEFAULT text-white text-sm px-4 py-2 rounded-xl font-semibold group-hover:bg-orange-600 transition-colors">
                  {q.type === "practical" ? "Soumettre" : "Passer le quiz"} →
                </span>
              </a>
            ))}
          </div>
        )}

        {/* Devoir à faire (consigne du formateur, niveau cours) */}
        {courseHomework && (
          <div className="mt-6 rounded-2xl border border-orange-100 bg-gradient-to-br from-orange-50 to-blush-50 p-5">
            <div className="flex items-center gap-2.5 mb-2">
              <span className="w-9 h-9 rounded-xl bg-orange-DEFAULT/15 text-orange-600 flex items-center justify-center"><ClipboardList size={18} /></span>
              <h3 className="font-playfair text-xl font-bold text-gray-900">Devoir à faire</h3>
            </div>
            <p className="text-sm text-gray-700 font-dm whitespace-pre-line leading-relaxed">{courseHomework}</p>
            <p className="text-xs text-orange-700/80 font-dm mt-3">↓ Importez votre travail ci-dessous, dans « Travaux pratiques ».</p>
          </div>
        )}

        {/* Q&R formatrice ↔ élève */}
        <LessonQA lessonId={lesson.id} items={qa} meId={user.id} isStaff={isStaff} />

        {/* Travaux pratiques (photo + vidéo) */}
        <LessonPractical lessonId={lesson.id} meId={user.id} isStaff={isStaff} submissions={practicals} />
      </div>

      {/* Sidebar — chapters + lessons */}
      <LessonSidebar
        chapters={(course?.chapters as any[]) ?? []}
        currentLessonId={lesson.id}
        completedLessons={completedLessons}
      />
    </div>
  );
}
