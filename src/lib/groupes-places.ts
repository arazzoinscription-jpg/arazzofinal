/**
 * Groupes EN LIGNE à places — règles PURES (testables).
 * Un groupe ouvert à l'inscription a un niveau (cours), un nombre de places et une date de début.
 * Une place est PRISE quand l'élève est membre du groupe : l'inscription au cours (créée à la
 * validation du paiement) l'y ajoute automatiquement (déclencheur de la migration 101).
 * « Intéressées » = demandes d'inscription encore en attente pour ce niveau (jamais inventé).
 */

export interface GroupeOuvert {
  id: string;
  nom: string;
  debut: string | null;
  capacite: number | null;
  prises: number;
}

export interface JaugePlaces { total: number; taken: number; interested: number; groupe: string | null }

/** Le groupe à montrer sur la landing : le premier qui a encore de la place, sinon le dernier (complet). */
export function groupeAAfficher(groupes: GroupeOuvert[]): GroupeOuvert | null {
  const avecPlaces = groupes.filter((g) => g.capacite);
  if (!avecPlaces.length) return null;
  return avecPlaces.find((g) => g.prises < (g.capacite as number)) ?? avecPlaces[avecPlaces.length - 1];
}

/** Libellé du groupe : « Promo octobre · début le 3 nov. ». */
export function libelleGroupe(g: Pick<GroupeOuvert, "nom" | "debut">, langue: "fr" | "ar" = "fr"): string {
  if (!g.debut) return g.nom;
  const date = new Date(`${g.debut}T12:00:00Z`).toLocaleDateString(langue === "ar" ? "ar-DZ" : "fr-FR", { day: "numeric", month: "long", timeZone: "Africa/Algiers" });
  return langue === "ar" ? `${g.nom} · يبدأ ${date}` : `${g.nom} · début le ${date}`;
}

export function jaugeDe(groupes: GroupeOuvert[], interessees: number): JaugePlaces | null {
  const g = groupeAAfficher(groupes);
  if (!g || !g.capacite) return null;
  return { total: g.capacite, taken: Math.min(g.prises, g.capacite), interested: Math.max(0, interessees), groupe: libelleGroupe(g) };
}

/** Réglages d'inscription saisis par l'enseignante (jamais de confiance). */
export function lireReglagesInscription(brut: unknown): { ok: true; capacite: number | null; debut: string | null; ouverte: boolean } | { ok: false; erreur: string } {
  const r = (brut && typeof brut === "object" ? brut : {}) as { capacite?: unknown; debut?: unknown; ouverte?: unknown };
  const capacite = r.capacite === null || r.capacite === "" || r.capacite === undefined ? null : Number(r.capacite);
  if (capacite !== null && (!Number.isInteger(capacite) || capacite < 1 || capacite > 500)) return { ok: false, erreur: "Nombre de places : entre 1 et 500." };
  const debut = typeof r.debut === "string" && /^\d{4}-\d{2}-\d{2}$/.test(r.debut) ? r.debut : null;
  const ouverte = r.ouverte === true;
  if (ouverte && !capacite) return { ok: false, erreur: "Indiquez le nombre de places avant d'ouvrir l'inscription." };
  return { ok: true, capacite, debut, ouverte };
}
