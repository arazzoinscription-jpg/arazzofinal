"use client";

import Link from "next/link";
import { clsx } from "clsx";

export function LessonSidebar({
  chapters,
  currentLessonId,
  completedLessons,
}: {
  chapters: any[];
  currentLessonId: string;
  completedLessons: Set<string>;
}) {
  const sorted = [...chapters].sort((a, b) => a.ordre - b.ordre);

  return (
    <aside className="w-full lg:w-72 flex-shrink-0">
      <div className="bg-white rounded-2xl border border-cream-200 overflow-hidden">
        <div className="p-4 border-b border-cream-100 bg-cream-50">
          <h2 className="font-semibold text-gray-900 text-sm">Programme du cours</h2>
        </div>
        <div className="max-h-[70vh] overflow-y-auto divide-y divide-cream-100">
          {sorted.map((chapter) => (
            <div key={chapter.id}>
              <div className="px-4 py-3 bg-cream-50 text-xs font-bold text-gray-500 uppercase tracking-wider">
                {chapter.titre}
              </div>
              {(chapter.lessons as any[])
                ?.sort((a: any, b: any) => a.ordre - b.ordre)
                .map((lesson: any) => {
                  const isActive = lesson.id === currentLessonId;
                  const isDone = completedLessons.has(lesson.id);
                  return (
                    <Link
                      key={lesson.id}
                      href={`/dashboard/cours/${lesson.id}`}
                      className={clsx(
                        "flex items-center gap-3 px-4 py-3 text-sm transition-colors",
                        isActive
                          ? "bg-orange-50 text-orange-600 font-semibold"
                          : "text-gray-600 hover:bg-cream-50"
                      )}
                    >
                      <span className="flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center text-xs">
                        {isDone ? (
                          <span className="text-orange-600">✓</span>
                        ) : isActive ? (
                          <span className="w-2 h-2 rounded-full bg-orange-DEFAULT block" />
                        ) : null}
                      </span>
                      <span className="line-clamp-2">{lesson.titre}</span>
                      {lesson.duree_minutes && (
                        <span className="ml-auto text-xs text-gray-400 flex-shrink-0">
                          {lesson.duree_minutes}m
                        </span>
                      )}
                    </Link>
                  );
                })}
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}
