"use client";

import { useEffect, useState } from "react";

interface XPBarProps {
  level: string;
  nextLevel: string | null;
  xpTotal: number;
  xpToNext: number;
  tierPct: number;          // 0–100 vers le niveau suivant
  gainedXp?: number | null; // si défini → affiche un toast flottant "+X XP"
}

/** Barre de niveau & XP, avec transition CSS et toast flottant optionnel. */
export function XPBar({ level, nextLevel, xpTotal, xpToNext, tierPct, gainedXp }: XPBarProps) {
  // Animation de remplissage : on part de 0 puis on remplit
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setWidth(tierPct), 80);
    return () => clearTimeout(t);
  }, [tierPct]);

  // Toast "+X XP" : re-déclenché à chaque nouvelle valeur de gainedXp
  const [toastKey, setToastKey] = useState(0);
  useEffect(() => {
    if (gainedXp && gainedXp > 0) setToastKey((k) => k + 1);
  }, [gainedXp]);

  return (
    <div className="relative bg-gradient-to-br from-violet-DEFAULT to-violet-800 rounded-3xl p-6 text-white shadow-glow overflow-hidden">
      <div className="absolute top-0 right-0 w-40 h-40 bg-blush-300/15 rounded-full -translate-y-1/3 translate-x-1/3 blur-2xl" />

      {/* Toast +XP */}
      {gainedXp ? (
        <div key={toastKey} className="absolute right-6 top-6 animate-xp-float text-orange-200 font-bold text-lg pointer-events-none">
          +{gainedXp} XP
        </div>
      ) : null}

      <div className="relative flex items-end justify-between mb-3">
        <div>
          <div className="text-violet-200 text-xs uppercase tracking-wider font-dm">Niveau</div>
          <div className="font-playfair text-2xl sm:text-3xl font-bold capitalize">{level}</div>
        </div>
        <div className="text-right">
          <div className="font-playfair text-2xl sm:text-3xl font-bold">{xpTotal.toLocaleString("fr-FR")} XP</div>
        </div>
      </div>

      <div className="relative h-3 bg-white/15 rounded-full overflow-hidden">
        <div className="h-full bg-gradient-to-r from-orange-300 to-orange-DEFAULT rounded-full transition-[width] duration-1000 ease-out"
          style={{ width: `${width}%` }} />
      </div>

      <div className="relative mt-2 text-xs text-violet-200 font-dm">
        {nextLevel
          ? <>Plus que <strong className="text-white">{xpToNext.toLocaleString("fr-FR")} XP</strong> pour devenir <span className="capitalize">« {nextLevel} »</span></>
          : <>Niveau maximum atteint 🎉</>}
      </div>
    </div>
  );
}
