/**
 * Période d'inscription pour remplir un groupe (« inscrites entre le … et le … ») — module PUR.
 * Les dates sont des JOURS d'Alger (UTC+1, sans heure d'été) ; les deux bornes sont incluses.
 */

const JOUR = /^\d{4}-\d{2}-\d{2}$/;

export interface Periode { du: string | null; au: string | null }
/** Bornes prêtes pour la base : depuis ≤ date < avant (ISO). */
export interface Bornes { depuis: string | null; avant: string | null }

function jourValide(j: unknown): string | null {
  if (typeof j !== "string" || !JOUR.test(j)) return null;
  const d = new Date(`${j}T12:00:00Z`);
  return Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== j ? null : j;
}

function lendemain(j: string): string {
  const d = new Date(`${j}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

/** Lit une période venue du navigateur (jamais de confiance) ; dates inversées → remises dans l'ordre. */
export function lirePeriode(brut: unknown): Periode {
  const p = (brut && typeof brut === "object" ? brut : {}) as { du?: unknown; au?: unknown };
  let du = jourValide(p.du); let au = jourValide(p.au);
  if (du && au && du > au) [du, au] = [au, du];
  return { du, au };
}

export function periodeActive(p: Periode): boolean {
  return Boolean(p.du || p.au);
}

/** Jours d'Alger → instants ISO (début du 1er jour inclus, lendemain du dernier jour exclu). */
export function bornesDe(p: Periode): Bornes {
  return {
    depuis: p.du ? new Date(`${p.du}T00:00:00+01:00`).toISOString() : null,
    avant: p.au ? new Date(`${lendemain(p.au)}T00:00:00+01:00`).toISOString() : null,
  };
}

/** Jour d'Alger d'un instant (« 2026-10-14 »). */
export function jourAlger(d: Date): string {
  return new Date(d.getTime() + 60 * 60_000).toISOString().slice(0, 10);
}

/** Raccourcis proposés à l'enseignante. */
export function raccourcis(maintenant: Date): { libelle: string; periode: Periode }[] {
  const aujourdhui = jourAlger(maintenant);
  const ilYa = (n: number) => jourAlger(new Date(maintenant.getTime() - n * 86_400_000));
  return [
    { libelle: "7 derniers jours", periode: { du: ilYa(6), au: aujourdhui } },
    { libelle: "30 derniers jours", periode: { du: ilYa(29), au: aujourdhui } },
    { libelle: "Ce mois-ci", periode: { du: `${aujourdhui.slice(0, 7)}-01`, au: aujourdhui } },
  ];
}
