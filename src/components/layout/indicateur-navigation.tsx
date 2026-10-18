"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Retour visuel IMMÉDIAT quand on touche un lien du site : une barre de chargement en haut de l'écran, puis (si la
 * page tarde) une petite pastille « Chargement… ». Sans elle, le téléphone semble bloqué pendant que la page suivante
 * arrive (ex. de La Cour vers le tableau de bord). Disparaît dès que l'adresse a changé (ou au bout de 15 s).
 */
export function IndicateurNavigation() {
  const [actif, setActif] = useState(false);
  const [long, setLong] = useState(false);
  const depart = useRef<string>("");

  useEffect(() => {
    function surClic(e: MouseEvent) {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a");
      if (!a || !a.href || a.target === "_blank" || a.hasAttribute("download")) return;
      let cible: URL;
      try { cible = new URL(a.href, window.location.href); } catch { return; }
      if (cible.origin !== window.location.origin) return;
      // Même page (ou simple ancre) : rien ne se charge.
      if (cible.pathname === window.location.pathname && cible.search === window.location.search) return;
      depart.current = window.location.href;
      setActif(true);
    }
    document.addEventListener("click", surClic);
    return () => document.removeEventListener("click", surClic);
  }, []);

  useEffect(() => {
    if (!actif) { setLong(false); return; }
    const pastille = window.setTimeout(() => setLong(true), 700);
    const securite = window.setTimeout(() => setActif(false), 15_000);
    // L'adresse a changé : la nouvelle page est là.
    const veille = window.setInterval(() => { if (window.location.href !== depart.current) setActif(false); }, 100);
    return () => { window.clearTimeout(pastille); window.clearTimeout(securite); window.clearInterval(veille); };
  }, [actif]);

  if (!actif) return null;
  return (
    <>
      <div aria-hidden className="fixed top-0 inset-x-0 z-[200] h-[3px] pointer-events-none">
        <div className="h-full bg-gradient-to-r from-[#FE7223] via-[#e1306c] to-[#5B16F9] animate-[navigation-barre_8s_cubic-bezier(.1,.7,.2,1)_forwards] motion-reduce:animate-none motion-reduce:w-2/3" />
      </div>
      {long ? (
        <div role="status" className="fixed z-[200] top-[max(10px,env(safe-area-inset-top))] start-1/2 -translate-x-1/2 inline-flex items-center gap-2 rounded-full bg-white/95 dark:bg-[#1c1535]/95 text-[#2A0880] dark:text-white text-sm font-semibold px-4 py-2 shadow-lg pointer-events-none">
          <span className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" aria-hidden /> Chargement…
        </div>
      ) : null}
      <style>{"@keyframes navigation-barre{0%{width:0}15%{width:35%}100%{width:90%}}"}</style>
    </>
  );
}
