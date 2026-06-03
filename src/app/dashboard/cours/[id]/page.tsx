import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logActivity } from "@/lib/activity";
import { LessonWatch } from "@/components/player/lesson-watch";
import { LessonSidebar } from "./lesson-sidebar";

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

  return (
    <div className="flex gap-6">
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
                className="flex items-center justify-between gap-4 bg-gradient-to-r from-violet-50 to-blush-50 border border-violet-100 rounded-2xl p-4 hover:shadow-soft transition-all group"
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
                <span className="flex-shrink-0 bg-violet-DEFAULT text-white text-sm px-4 py-2 rounded-xl font-semibold group-hover:bg-violet-700 transition-colors">
                  {q.type === "practical" ? "Soumettre" : "Passer le quiz"} →
                </span>
              </a>
            ))}
          </div>
        )}
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
