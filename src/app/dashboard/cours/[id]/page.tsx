import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BunnyPlayer } from "@/components/player/bunny-player";
import { LessonSidebar } from "./lesson-sidebar";
import { MarkCompleteButton } from "./mark-complete-button";

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
          id, titre_fr,
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

        <BunnyPlayer
          videoUrl={lesson.video_url_bunny}
          lessonId={lesson.id}
        />

        <div className="mt-6 flex items-center justify-between">
          <MarkCompleteButton
            lessonId={lesson.id}
            courseId={course?.id}
            isCompleted={completedLessons.has(lesson.id)}
          />
          {lesson.duree_minutes && (
            <span className="text-sm text-gray-400">
              ⏱ {lesson.duree_minutes} minutes
            </span>
          )}
        </div>
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
