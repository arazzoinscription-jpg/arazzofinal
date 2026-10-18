import { extensionPour } from "./messagerie-pieces";

/** Commentaires vocaux du feed — règles PURES (testables). 1 minute au plus. */
export const COMMENTAIRE_VOCAL_MAX_S = 60;
export const COMMENTAIRE_VOCAL_MAX_OCTETS = 3 * 1024 * 1024;
/** Texte gardé avec un commentaire vocal (lisible partout, même sans lecteur). */
export const TEXTE_COMMENTAIRE_VOCAL = "🎤 Commentaire vocal";

/** Vérifie un commentaire vocal ; renvoie l'extension du fichier, ou l'erreur à afficher. */
export function verifierCommentaireVocal(f: { type: string; size: number; duree: unknown }): { ok: true; extension: string; duree: number } | { ok: false; erreur: string } {
  const extension = extensionPour("audio", f.type);
  if (!extension) return { ok: false, erreur: "Format audio non pris en charge." };
  if (f.size < 100) return { ok: false, erreur: "Commentaire vocal vide." };
  if (f.size > COMMENTAIRE_VOCAL_MAX_OCTETS) return { ok: false, erreur: "Commentaire vocal trop lourd." };
  const d = typeof f.duree === "number" ? Math.round(f.duree) : Number.parseInt(String(f.duree ?? ""), 10);
  if (!Number.isFinite(d) || d < 1) return { ok: false, erreur: "Commentaire vocal vide." };
  return { ok: true, extension, duree: Math.min(COMMENTAIRE_VOCAL_MAX_S, d) };
}
