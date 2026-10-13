/**
 * Espace d'enseignement — QUI voit QUOI dans « Ma classe », le suivi pédagogique et les lives.
 * Module PUR (testable).
 *
 *  - administration (/admin) : toutes les élèves, tous les lives ;
 *  - formatrice (/formateur) : seulement les élèves inscrites à SES cours (courses.formateur_id),
 *    et seulement les lives qu'elle anime ou dont TOUS les niveaux sont à elle.
 * Les réglages du suivi (date de début, seuils) restent réservés à l'administration.
 */

export type Base = "/admin" | "/formateur";

export interface Espace {
  base: Base;
  userId: string;
  estAdmin: boolean;
  /** Cours de la formatrice ; null = tous (administration). */
  cours: ReadonlySet<string> | null;
}

/** Valeur d'un formulaire → base connue (jamais une adresse arbitraire). */
export function baseDepuis(valeur: unknown): Base {
  return valeur === "/formateur" ? "/formateur" : "/admin";
}

export function voitCours(e: Espace, courseId: string | null | undefined): boolean {
  return e.cours === null || (!!courseId && e.cours.has(courseId));
}

/** Une élève est visible si elle suit au moins un cours de l'espace. */
export function voitEleve(e: Espace, formations: readonly { course_id: string }[]): boolean {
  return e.cours === null || formations.some((f) => e.cours!.has(f.course_id));
}

/** Un live est visible (et modifiable) si on l'anime, ou si TOUS ses niveaux sont dans l'espace. */
export function voitLive(e: Espace, live: { formateur_id: string; course_id: string | null }, cours: readonly string[]): boolean {
  if (e.cours === null) return true;
  if (live.formateur_id === e.userId) return true;
  const niveaux = cours.length ? cours : live.course_id ? [live.course_id] : [];
  return niveaux.length > 0 && niveaux.every((c) => e.cours!.has(c));
}

/** Les niveaux qu'on peut choisir pour programmer un live. */
export function niveauxAutorises<T extends { id: string }>(e: Espace, niveaux: readonly T[]): T[] {
  return niveaux.filter((n) => voitCours(e, n.id));
}
