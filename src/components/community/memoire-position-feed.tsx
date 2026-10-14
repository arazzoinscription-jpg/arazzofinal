"use client";

import { useEffect } from "react";
import { CLE_POSITION_FEED, indexAffiche, indexARestaurer, lirePosition } from "./position-feed";

/** Le conteneur qui défile dans le feed (feed-client.tsx : `fixed inset-0 overflow-y-scroll snap-y`). */
const CONTENEUR = "div.fixed.inset-0.snap-y";
/** Plusieurs essais : le lecteur et le routeur peuvent encore bouger la page juste après l'affichage. */
const ESSAIS_MS = [0, 120, 300, 700, 1200];

/** Auteur + légende d'une vidéo du feed (sans toucher au lecteur). */
function empreinte(slide: Element): string {
  const lien = slide.querySelector('a[href^="/communaute/u/"]');
  const auteur = lien?.getAttribute("href") ?? "";
  // La légende suit le nom de l'auteur ; les messages passagers (chargement, son…) ne comptent pas.
  const suivant = lien?.nextElementSibling;
  const legende = suivant?.tagName === "P" ? (suivant.textContent ?? "").trim().slice(0, 80) : "";
  return auteur ? `${auteur}|${legende}` : "";
}

/**
 * Mémorise la vidéo du feed quand on la quitte par un lien (profil, commentaires…) et y revient
 * au retour. Sans effet si le conteneur n'est pas trouvé ; aucune donnée ne quitte l'appareil.
 */
export function MemoirePositionFeed() {
  useEffect(() => {
    const conteneur = document.querySelector<HTMLElement>(CONTENEUR);
    if (!conteneur) return;
    const slides = () => [...conteneur.querySelectorAll(":scope > section")];
    const minuteries: number[] = [];

    // 1) Retour : on se replace sur la vidéo quittée — sauf si l'élève a déjà commencé à défiler.
    //    La position n'est effacée qu'APRÈS les essais (un effet relancé ne doit pas la perdre).
    let brut: string | null = null;
    try { brut = sessionStorage.getItem(CLE_POSITION_FEED); } catch { brut = null; }
    // N'efface que la position LUE ici (pas une nouvelle, notée entre-temps en quittant le feed).
    const oublier = () => { try { if (sessionStorage.getItem(CLE_POSITION_FEED) === brut) sessionStorage.removeItem(CLE_POSITION_FEED); } catch { /* rien */ } };
    const p = lirePosition(brut, Date.now());
    let geste = false;
    const surGeste = () => { geste = true; oublier(); };
    const gestes = ["wheel", "touchstart", "keydown", "pointerdown"] as const;
    const cible = p ? indexARestaurer(p, slides().map(empreinte)) : null;
    if (cible === null || cible === 0) oublier();
    else {
      gestes.forEach((g) => conteneur.addEventListener(g, surGeste, { passive: true }));
      ESSAIS_MS.forEach((ms, n) => {
        minuteries.push(window.setTimeout(() => {
          if (!geste && conteneur.clientHeight && indexAffiche(conteneur.scrollTop, conteneur.clientHeight) !== cible) {
            conteneur.scrollTop = cible * conteneur.clientHeight;
          }
          if (n === ESSAIS_MS.length - 1) oublier();
        }, ms));
      });
    }

    // 2) Départ par un lien interne : on note la vidéo affichée.
    const auClic = (e: MouseEvent) => {
      const lien = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!lien || lien.target === "_blank") return;
      const url = new URL(lien.href, window.location.href);
      if (url.origin !== window.location.origin || url.pathname === window.location.pathname) return;
      const index = indexAffiche(conteneur.scrollTop, conteneur.clientHeight);
      const slide = slides()[index];
      try {
        if (index > 0 && slide) sessionStorage.setItem(CLE_POSITION_FEED, JSON.stringify({ index, empreinte: empreinte(slide), le: Date.now() }));
        else sessionStorage.removeItem(CLE_POSITION_FEED);
      } catch { /* stockage indisponible : on repartira du début */ }
    };
    document.addEventListener("click", auClic, true);
    return () => {
      document.removeEventListener("click", auClic, true);
      gestes.forEach((g) => conteneur.removeEventListener(g, surGeste));
      minuteries.forEach((m) => window.clearTimeout(m));
    };
  }, []);
  return null;
}
