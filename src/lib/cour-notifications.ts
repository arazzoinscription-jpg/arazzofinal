/**
 * Notifications de LA COUR — règles PURES (testables).
 *
 * Quand quelqu'un publie dans La Cour (story, vidéo, travail, résultat), TOUT LE MONDE est prévenu, mais au plus
 * UNE notification « La Cour » toutes les 3 heures par personne (sinon les téléphones vibrent toute la journée et
 * les élèves coupent tout, y compris les notifications des cours et de la cloche). Les publications de l'équipe
 * (formatrices, administration) passent en priorité : 1 heure suffit. L'autrice n'est jamais prévenue de sa propre
 * publication ; une personne qui a coupé « Notifications de La Cour » (Préférences) non plus.
 */

export type QuoiCour = "story" | "video" | "publication" | "resultat";

/** Type des lignes de notification (le téléphone remplace la précédente du même type au lieu d'empiler). */
export const TYPE_NOTIF_COUR = "cour";
export const DELAI_COUR_MS = 3 * 60 * 60_000;
export const DELAI_COUR_EQUIPE_MS = 60 * 60_000;

/** Le délai sans nouvelle notification « La Cour » avant d'en recevoir une autre. */
export function delaiCour(equipe: boolean): number {
  return equipe ? DELAI_COUR_EQUIPE_MS : DELAI_COUR_MS;
}

/** Le titre de la notification (nom PUBLIC de l'autrice). */
export function titreCour(quoi: QuoiCour, nom: string): string {
  const n = nom.trim() || "Quelqu'un";
  if (quoi === "story") return `✨ ${n} a publié une story`;
  if (quoi === "video") return `🎬 ${n} a partagé une vidéo`;
  if (quoi === "resultat") return `🎉 ${n} a terminé son modèle`;
  return `🧵 ${n} a partagé son travail`;
}

export const CORPS_COUR = "Venez voir dans La Cour 👀";

/** Qui prévenir : tout le monde, sauf l'autrice, celles qui ont coupé, et celles déjà prévenues dans le délai. */
export function destinatairesCour(e: {
  membres: readonly string[];
  auteurId: string;
  coupees: ReadonlySet<string>;
  dejaPrevenues: ReadonlySet<string>;
}): string[] {
  const vus = new Set<string>();
  const out: string[] = [];
  for (const id of e.membres) {
    if (!id || id === e.auteurId || e.coupees.has(id) || e.dejaPrevenues.has(id) || vus.has(id)) continue;
    vus.add(id);
    out.push(id);
  }
  return out;
}
