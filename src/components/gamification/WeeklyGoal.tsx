"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateWeeklyGoal } from "@/app/actions/gamification";

/** Objectif hebdomadaire avec jauge circulaire + édition de l'objectif. */
export function WeeklyGoal({ goal, done }: { goal: number; done: number }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(goal);
  const [isPending, startTransition] = useTransition();

  const pct = Math.min(100, Math.round((done / Math.max(1, goal)) * 100));
  const achieved = done >= goal;

  // Cercle SVG
  const R = 34, C = 2 * Math.PI * R;
  const offset = C - (pct / 100) * C;

  function save() {
    startTransition(async () => {
      const res = await updateWeeklyGoal(value);
      if (res.ok) { setEditing(false); router.refresh(); }
    });
  }

  return (
    <div className="bg-white rounded-2xl border border-cream-200 shadow-soft p-5">
      <h3 className="font-playfair text-lg font-bold text-gray-900 mb-4">🎯 Objectif de la semaine</h3>

      <div className="flex items-center gap-5">
        {/* Jauge circulaire */}
        <div className="relative w-24 h-24 flex-shrink-0">
          <svg className="w-24 h-24 -rotate-90" viewBox="0 0 80 80">
            <circle cx="40" cy="40" r={R} fill="none" stroke="#E8DED4" strokeWidth="8" />
            <circle cx="40" cy="40" r={R} fill="none" stroke="#4B3BC7" strokeWidth="8" strokeLinecap="round"
              strokeDasharray={C} strokeDashoffset={offset} className="transition-[stroke-dashoffset] duration-700" />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-playfair text-xl font-bold text-orange-600">{done}/{goal}</span>
            <span className="text-[10px] text-gray-400 font-dm">leçons</span>
          </div>
        </div>

        <div className="flex-1">
          {achieved ? (
            <p className="text-green-600 font-semibold font-dm">Objectif atteint, bravo ! 🌟</p>
          ) : (
            <p className="text-gray-600 font-dm text-sm">
              Plus que <strong>{goal - done}</strong> leçon{goal - done > 1 ? "s" : ""} pour atteindre votre objectif.
            </p>
          )}

          {editing ? (
            <div className="flex items-center gap-2 mt-3">
              <input type="number" min={1} max={14} value={value}
                onChange={(e) => setValue(Number(e.target.value))}
                className="w-16 border border-gray-200 rounded-lg px-2 py-1 text-sm" />
              <button onClick={save} disabled={isPending}
                className="text-sm bg-orange-DEFAULT text-white px-3 py-1 rounded-lg font-semibold disabled:opacity-50">
                {isPending ? "…" : "OK"}
              </button>
              <button onClick={() => setEditing(false)} className="text-sm text-gray-400">Annuler</button>
            </div>
          ) : (
            <button onClick={() => setEditing(true)} className="mt-3 text-sm text-orange-600 font-semibold hover:underline">
              Modifier l'objectif
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
