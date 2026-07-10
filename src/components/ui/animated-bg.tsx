"use client";

import { useLiteMode } from "@/lib/use-lite-mode";

/**
 * Fond animé clair : halos dégradés flous qui dérivent lentement.
 * À placer comme premier enfant d'un conteneur `relative`.
 *
 * ⚡ Sur mobile / faible CPU / prefers-reduced-motion (useLiteMode) : version
 * ALLÉGÉE — 2 halos STATIQUES (aucune animation → pas de repaint GPU continu),
 * ce qui évite la lenteur et les à-coups lors de la navigation sur téléphone.
 */
export function AnimatedBackground() {
  const lite = useLiteMode();

  if (lite) {
    return (
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 -start-32 w-[30rem] h-[30rem] rounded-full bg-orange-200/25 dark:bg-orange-600/10 blur-2xl" />
        <div className="absolute -bottom-48 end-1/4 w-[28rem] h-[28rem] rounded-full bg-violet-200/25 dark:bg-violet-700/10 blur-2xl" />
      </div>
    );
  }

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div className="absolute -top-40 -start-32 w-[42rem] h-[42rem] rounded-full bg-orange-200/35 dark:bg-orange-600/10 blur-3xl animate-blob" />
      <div className="absolute top-1/3 -end-44 w-[38rem] h-[38rem] rounded-full bg-violet-200/35 dark:bg-violet-700/12 blur-3xl animate-blob" style={{ animationDelay: "7s" }} />
      <div className="absolute -bottom-48 start-1/4 w-[36rem] h-[36rem] rounded-full bg-blush-200/35 dark:bg-blush-600/10 blur-3xl animate-blob" style={{ animationDelay: "13s" }} />
      <div className="absolute top-10 end-1/3 w-[26rem] h-[26rem] rounded-full bg-teal-100/30 dark:bg-teal-700/10 blur-3xl animate-blob" style={{ animationDelay: "4s" }} />
    </div>
  );
}
