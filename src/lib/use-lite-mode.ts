"use client";

import { useEffect, useState } from "react";

/**
 * « Mode léger » : vrai sur mobile / petit écran, si l'utilisateur préfère
 * réduire les animations, ou sur un appareil à faible nombre de cœurs CPU.
 * Utilisé pour NE PAS monter les fonds animés lourds (canvas, WebGL, particules)
 * qui saturent le processeur des téléphones.
 *
 * Valeur initiale = true (SSR + 1er rendu) → les composants lourds ne se peignent
 * pas avant l'hydratation ; sur desktop capable, l'effet repasse à false.
 */
export function useLiteMode(): boolean {
  const [lite, setLite] = useState(true);

  useEffect(() => {
    const mqMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const mqSmall = window.matchMedia("(max-width: 820px)");
    const lowCpu = (navigator.hardwareConcurrency ?? 8) <= 4;
    const compute = () => setLite(mqMotion.matches || mqSmall.matches || lowCpu);
    compute();
    mqMotion.addEventListener?.("change", compute);
    mqSmall.addEventListener?.("change", compute);
    return () => {
      mqMotion.removeEventListener?.("change", compute);
      mqSmall.removeEventListener?.("change", compute);
    };
  }, []);

  return lite;
}
