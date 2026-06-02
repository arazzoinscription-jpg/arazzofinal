import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
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

  // Progression vidéo sauvegardée (reprise + % regardé)
  const { data: vp } = await supabase
    .from("video_progress")
    .select("last_position_sec, watched_pct")
    .eq("user_id", user.id)
    .eq("lesson_id", lesson.id)
    .maybeSingle();

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
