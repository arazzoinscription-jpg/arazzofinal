/**
 * Retour au feed à la MÊME vidéo après avoir ouvert un profil (ou toute autre page).
 * Le feed défile dans un conteneur plein écran (pas la fenêtre) : le navigateur ne
 * restaure donc pas la position tout seul. Module pur + sessionStorage (onglet courant).
 */

export const CLE_POSITION_FEED = "arazzo:feed-position";
/** Au-delà, on repart du début (nouvelle visite, pas un « retour »). */
export const VALIDITE_POSITION_MS = 30 * 60_000;

export interface PositionFeed {
  index: number;
  /** Empreinte de la vidéo quittée (auteur + légende) : le feed est mélangé à chaque chargement. */
  empreinte: string;
  le: number;
}

export function lirePosition(brut: string | null, maintenant: number): PositionFeed | null {
  if (!brut) return null;
  try {
    const p = JSON.parse(brut) as Partial<PositionFeed>;
    if (typeof p.index !== "number" || typeof p.le !== "number" || !Number.isInteger(p.index) || p.index < 1) return null;
    if (maintenant - p.le > VALIDITE_POSITION_MS || p.le > maintenant + 60_000) return null;
    return { index: p.index, empreinte: typeof p.empreinte === "string" ? p.empreinte : "", le: p.le };
  } catch {
    return null;
  }
}

/** Index de la vidéo affichée (chaque vidéo occupe toute la hauteur du conteneur). */
export function indexAffiche(scrollTop: number, hauteur: number): number {
  return hauteur > 0 ? Math.max(0, Math.round(scrollTop / hauteur)) : 0;
}

/**
 * Où revenir : la vidéo qui porte la même empreinte (le feed a pu être mélangé) ;
 * sinon l'ancienne position seulement si l'ordre n'a pas bougé ; sinon nulle part (on reste en haut).
 */
export function indexARestaurer(p: PositionFeed, empreintes: readonly string[]): number | null {
  if (p.empreinte) {
    const i = empreintes.indexOf(p.empreinte);
    if (i >= 0) return i;
    return null;
  }
  return p.index < empreintes.length ? p.index : null;
}
