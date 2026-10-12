"use client";

import Link from "next/link";
import { clsx } from "clsx";
import { Lock } from "lucide-react";

export function LessonSidebar({
  chapters,
  currentLessonId,
  completedLessons,
  lockedChapterIds,
  unlockMonthByChapter,
  variant = "all",
}: {
  chapters: any[];
  currentLessonId: string;
  completedLessons: Set<string>;
  lockedChapterIds?: Set<string>;
  unlockMonthByChapter?: Record<string, number>;
  /** "mobile" = menu déroulant EN HAUT (téléphone, juste devant la vidéo) ; "desktop" = colonne de droite (ordinateur). */
  variant?: "all" | "mobile" | "desktop";
}) {
  const sorted = [...chapters].sort((a, b) => a.ordre - b.ordre);
  const toutes = sorted.flatMap((c) => [...((c.lessons as any[]) ?? [])].sort((a: any, b: any) => a.ordre - b.ordre));
  const rang = toutes.findIndex((l: any) => l.id === currentLessonId) + 1;
  const faites = toutes.filter((l: any) => completedLessons.has(l.id)).length;

  if (variant === "mobile") {
    return (
      <details className="lg:hidden bg-white rounded-2xl border border-cream-200 overflow-hidden mb-3 group">
        <summary className="list-none cursor-pointer p-3.5 flex items-center gap-3 bg-cream-50">
          <span className="text-lg">📚</span>
          <span className="flex-1 min-w-0">
            <span className="block font-semibold text-gray-900 text-sm">Programme du cours</span>
            <span className="block text-xs text-gray-500">Leçon {rang || "—"}/{toutes.length} · {faites} terminée(s)</span>
          </span>
          <span className="text-gray-400 text-sm transition-transform group-open:rotate-180">▼</span>
        </summary>
        <div className="max-h-[60vh] overflow-y-auto divide-y divide-cream-100 border-t border-cream-100">
          {liste()}
        </div>
      </details>
    );
  }

  return (
    <aside className={variant === "desktop" ? "hidden lg:block lg:w-72 flex-shrink-0" : "w-full lg:w-72 flex-shrink-0"}>
      <div className="bg-white rounded-2xl border border-cream-200 overflow-hidden">
        <div className="p-4 border-b border-cream-100 bg-cream-50">
          <h2 className="font-semibold text-gray-900 text-sm">Programme du cours</h2>
        </div>
        <div className="max-h-[70vh] overflow-y-auto divide-y divide-cream-100">
          {liste()}
        </div>
      </div>
    </aside>
  );

  function liste() {
    return (
      <>
          {sorted.map((chapter) => {
            const locked = lockedChapterIds?.has(chapter.id) ?? false;
            const unlockMonth = unlockMonthByChapter?.[chapter.id];
            return (
            <div key={chapter.id}>
              <div className="px-4 py-3 bg-cream-50 text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                <span className="flex-1">{chapter.titre}</span>
                {locked && (
                  <span className="inline-flex items-center gap-1 normal-case font-semibold text-violet-600">
                    <Lock size={12} /> Mois {unlockMonth ?? "—"}
                  </span>
                )}
              </div>
              {(chapter.lessons as any[])
                ?.sort((a: any, b: any) => a.ordre - b.ordre)
                .map((lesson: any) => {
                  const isActive = lesson.id === currentLessonId;
                  const isDone = completedLessons.has(lesson.id);

                  // Chapitre verrouillé (abonnement) : leçon non cliquable, sauf aperçu gratuit.
                  if (locked && !lesson.is_preview) {
                    return (
                      <div
                        key={lesson.id}
                        title={`Se débloque au mois ${unlockMonth ?? ""}`}
                        className="flex items-center gap-3 px-4 py-3 text-sm text-gray-300 cursor-not-allowed select-none"
                      >
                        <span className="flex-shrink-0 w-5 h-5 rounded-full border-2 border-gray-200 flex items-center justify-center">
                          <Lock size={11} className="text-gray-300" />
                        </span>
                        <span className="line-clamp-2">{lesson.titre}</span>
                      </div>
                    );
                  }

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
            );
          })}
      </>
    );
  }
}
