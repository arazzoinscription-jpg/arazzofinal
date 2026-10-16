/** Stories déjà vues sur cet appareil (anneau gris au lieu de coloré, ordre de la barre). */

const CLE_VUES = "arazzo:stories-vues";
const EVENEMENT = "arazzo:stories-vues";

export function lireVues(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(CLE_VUES) ?? "[]") as string[]); } catch { return new Set(); }
}

export function noterVues(ids: string[]) {
  try {
    const v = lireVues();
    const avant = v.size;
    ids.forEach((id) => v.add(id));
    if (v.size === avant) return;
    localStorage.setItem(CLE_VUES, JSON.stringify([...v].slice(-500)));
    window.dispatchEvent(new Event(EVENEMENT));
  } catch { /* stockage indisponible */ }
}

/** Être prévenu quand une story est vue (les anneaux se mettent à jour pendant la lecture). */
export function ecouterVues(rappel: () => void): () => void {
  window.addEventListener(EVENEMENT, rappel);
  return () => window.removeEventListener(EVENEMENT, rappel);
}
