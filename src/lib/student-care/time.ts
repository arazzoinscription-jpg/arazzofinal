/**
 * Suivi pédagogique — le temps se compte à l'heure d'ALGER.
 *
 * Le serveur (Vercel) tourne en UTC. Compter les jours en UTC décalerait d'une
 * heure chaque seuil : une leçon terminée à 00 h 30 à Alger serait datée de la
 * veille. Toutes les règles du suivi passent donc par ce module, qui raisonne
 * en jours calendaires du fuseau `Africa/Algiers` (UTC+1, sans heure d'été).
 *
 * Module PUR : aucun accès réseau ni base, testable tel quel.
 */

export const TZ = "Africa/Algiers";

const JOUR_MS = 86_400_000;

const formatJour = new Intl.DateTimeFormat("en-CA", {
  timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit",
});

const formatParties = new Intl.DateTimeFormat("en-US", {
  timeZone: TZ, hourCycle: "h23",
  year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit", second: "2-digit",
});

function versDate(instant: Date | string): Date | null {
  const d = typeof instant === "string" ? new Date(instant) : instant;
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Vrai si `jour` est une date AAAA-MM-JJ qui existe vraiment (pas de 31 février). */
export function estJourValide(jour: unknown): jour is string {
  if (typeof jour !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(jour)) return false;
  const [a, m, j] = jour.split("-").map(Number);
  const d = new Date(Date.UTC(a, m - 1, j));
  return d.getUTCFullYear() === a && d.getUTCMonth() === m - 1 && d.getUTCDate() === j;
}

/** Le jour calendaire (AAAA-MM-JJ) d'un instant, à l'heure d'Alger. */
export function jourAlger(instant: Date | string): string {
  const d = versDate(instant);
  if (!d) throw new Error("Instant invalide");
  return formatJour.format(d);
}

function numeroDuJour(jour: string): number {
  const [a, m, j] = jour.split("-").map(Number);
  return Math.floor(Date.UTC(a, m - 1, j) / JOUR_MS);
}

/**
 * Jours calendaires écoulés, à l'heure d'Alger, entre `instant` et `maintenant`.
 * 0 = aujourd'hui, 1 = hier… `null` quand il n'y a pas de date (jamais « 0 »).
 */
export function joursDepuis(instant: string | null | undefined, maintenant: Date): number | null {
  if (!instant) return null;
  const d = versDate(instant);
  if (!d) return null;
  return numeroDuJour(jourAlger(maintenant)) - numeroDuJour(jourAlger(d));
}

/** Décalage du fuseau d'Alger par rapport à UTC à un instant donné (ms). */
function decalageAlger(instant: Date): number {
  const p = Object.fromEntries(formatParties.formatToParts(instant).map((x) => [x.type, x.value]));
  const commeUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  return commeUtc - instant.getTime();
}

/**
 * Minuit À ALGER du jour donné, exprimé en instant ISO (UTC).
 * « Suivi depuis le 1er octobre » = à partir du 1er octobre 00 h 00 heure d'Alger,
 * soit le 30 septembre 23 h 00 UTC.
 */
export function minuitAlgerIso(jour: string): string {
  if (!estJourValide(jour)) throw new Error(`Date invalide : « ${jour} »`);
  const [a, m, j] = jour.split("-").map(Number);
  const supposition = new Date(Date.UTC(a, m - 1, j));
  return new Date(supposition.getTime() - decalageAlger(supposition)).toISOString();
}

/** Aujourd'hui (AAAA-MM-JJ) à Alger. */
export function aujourdhuiAlger(maintenant: Date): string {
  return jourAlger(maintenant);
}

/** Affichage d'une date à l'heure d'Alger (« 3 oct. 2026 »), ou « — ». */
export function dateCourte(instant: string | null | undefined): string {
  const d = instant ? versDate(instant) : null;
  if (!d) return "—";
  return d.toLocaleDateString("fr-FR", { timeZone: TZ, day: "numeric", month: "short", year: "numeric" });
}

/** Affichage d'une date et heure à l'heure d'Alger (« 3 oct. 2026, 14:05 »), ou « — ». */
export function dateHeure(instant: string | null | undefined): string {
  const d = instant ? versDate(instant) : null;
  if (!d) return "—";
  return d.toLocaleString("fr-FR", {
    timeZone: TZ, day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

/** « aujourd'hui », « hier », « il y a 12 j ». */
export function ilYA(jours: number | null): string {
  if (jours === null) return "—";
  if (jours <= 0) return "aujourd'hui";
  if (jours === 1) return "hier";
  return `il y a ${jours} j`;
}
