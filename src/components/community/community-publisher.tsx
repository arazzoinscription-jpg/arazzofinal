"use client";

import { useState } from "react";
import { CommunityVideoUploader } from "./video-uploader";

/**
 * Publication d'une vidéo communauté liée à un cours (teaser) ou un patron (démo).
 * Sélecteur de l'élément concerné + uploader (le CTA du feed est dérivé de la source).
 */
export function CommunityPublisher({
  sourceType, items, kind,
}: {
  sourceType: "course_teaser" | "patron_demo";
  items: { id: string; label: string }[];
  kind: "course" | "patron";
}) {
  const [sel, setSel] = useState(items[0]?.id ?? "");

  if (items.length === 0) {
    return (
      <p className="text-sm text-gray-500 dark:text-white/50 bg-white dark:bg-white/[0.04] border border-cream-200 dark:border-white/10 rounded-2xl p-5">
        {kind === "course"
          ? "Vous n'avez pas encore de cours. Créez un cours pour publier un teaser."
          : "Vous n'avez pas encore de patron. Ajoutez un patron pour publier une démo."}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <label className="block">
        <span className="block text-sm font-medium text-gray-700 dark:text-white/70 mb-1.5">
          {kind === "course" ? "Cours mis en avant" : "Patron mis en avant"}
        </span>
        <select value={sel} onChange={(e) => setSel(e.target.value)}
          className="w-full border border-gray-200 dark:border-white/15 bg-white dark:bg-white/5 rounded-xl px-4 py-2.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500">
          {items.map((i) => <option key={i.id} value={i.id}>{i.label}</option>)}
        </select>
      </label>

      {/* key=sel : réinitialise l'uploader quand on change d'élément */}
      <CommunityVideoUploader
        key={sel}
        sourceType={sourceType}
        courseId={kind === "course" ? sel : undefined}
        patronId={kind === "patron" ? sel : undefined}
      />
    </div>
  );
}
