/**
 * Lives pédagogiques — repli si la migration 096 n'est pas (encore) appliquée.
 * Les pages existantes (élève, formatrice) retombent alors sur leur requête
 * d'origine au lieu de casser. Module PUR.
 */

/** Table ou colonne inconnue de la base (migration absente). */
export function migrationAbsente(err: { code?: string; message?: string } | null | undefined): boolean {
  if (!err) return false;
  return ["42P01", "42703", "PGRST205", "PGRST204"].includes(err.code ?? "")
    || /does not exist|Could not find the (table|relation|'.*' column)/i.test(err.message ?? "");
}

/** « 2026-10-20T19:00 » (champ datetime-local) → { jour, heure }, ou null. */
export function lireDateHeureLocale(v: string): { jour: string; heure: string } | null {
  const m = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/.exec(v.trim());
  return m ? { jour: m[1], heure: m[2] } : null;
}
