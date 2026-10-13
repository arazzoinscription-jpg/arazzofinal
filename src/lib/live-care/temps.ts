/**
 * Lives pédagogiques — dates et heures à l'heure d'ALGER.
 *
 * L'administratrice saisit « mardi 20 octobre, 19:00 » en pensant à Alger. Le
 * serveur (Vercel) tourne en UTC : `new Date("2026-10-20T19:00")` y donnerait
 * 19:00 UTC, soit 20:00 à Alger — le décalage d'une heure constaté dans le
 * formulaire formatrice existant. Ici, toute saisie est convertie explicitement
 * depuis le fuseau `Africa/Algiers`, et tout affichage s'y refait.
 *
 * Module PUR.
 */

import { TZ, estJourValide, jourAlger } from "../student-care/time";

export { TZ, estJourValide, jourAlger };

const JOUR_MS = 86_400_000;

const formatParties = new Intl.DateTimeFormat("en-US", {
  timeZone: TZ, hourCycle: "h23", weekday: "short",
  year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit",
});

function parties(instant: Date) {
  return Object.fromEntries(formatParties.formatToParts(instant).map((x) => [x.type, x.value])) as Record<string, string>;
}

/** Décalage d'Alger par rapport à UTC à cet instant (ms) — +3 600 000 toute l'année. */
function decalage(instant: Date): number {
  const p = parties(instant);
  return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second) - instant.getTime();
}

/** « HH:MM » valide (00:00 → 23:59). */
export function estHeureValide(h: unknown): h is string {
  return typeof h === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(h);
}

/** Instant ISO (UTC) correspondant à un jour + une heure lus À ALGER. */
export function instantAlger(jour: string, heure: string): string {
  if (!estJourValide(jour)) throw new Error(`Date invalide : « ${jour} »`);
  if (!estHeureValide(heure)) throw new Error(`Heure invalide : « ${heure} »`);
  const [a, m, j] = jour.split("-").map(Number);
  const [h, mi] = heure.split(":").map(Number);
  const supposition = new Date(Date.UTC(a, m - 1, j, h, mi));
  return new Date(supposition.getTime() - decalage(supposition)).toISOString();
}

/** L'heure « HH:MM » d'un instant, à Alger. */
export function heureAlger(instant: string): string {
  const p = parties(new Date(instant));
  return `${p.hour}:${p.minute}`;
}

/** Jour de la semaine ISO (1 = lundi … 7 = dimanche) d'un jour AAAA-MM-JJ. */
export function jourSemaine(jour: string): number {
  const [a, m, j] = jour.split("-").map(Number);
  const d = new Date(Date.UTC(a, m - 1, j)).getUTCDay();
  return d === 0 ? 7 : d;
}

/** Ajoute (ou retire) des jours calendaires à un jour AAAA-MM-JJ. */
export function ajouterJours(jour: string, n: number): string {
  const [a, m, j] = jour.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, j) + n * JOUR_MS).toISOString().slice(0, 10);
}

/** Écart en jours entre deux jours AAAA-MM-JJ (b − a). */
export function ecartJours(a: string, b: string): number {
  const ms = (x: string) => { const [y, m, d] = x.split("-").map(Number); return Date.UTC(y, m - 1, d); };
  return Math.round((ms(b) - ms(a)) / JOUR_MS);
}

export const NOMS_JOURS = ["", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"];

/** « mardi 20 oct. 2026 » (Alger). */
export function dateLongue(instant: string): string {
  return new Date(instant).toLocaleDateString("fr-FR", { timeZone: TZ, weekday: "long", day: "numeric", month: "short", year: "numeric" });
}

/** « 19:00 » (Alger). */
export function heureCourte(instant: string): string {
  return heureAlger(instant);
}

/** Mois « AAAA-MM » valide. */
export function estMoisValide(m: unknown): m is string {
  return typeof m === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(m);
}

/** Les semaines (lundi → dimanche) qui couvrent un mois, en jours AAAA-MM-JJ. */
export function semainesDuMois(mois: string): string[][] {
  const premier = `${mois}-01`;
  const debut = ajouterJours(premier, 1 - jourSemaine(premier));
  const [a, m] = mois.split("-").map(Number);
  const dernier = new Date(Date.UTC(a, m, 0)).toISOString().slice(0, 10);
  const fin = ajouterJours(dernier, 7 - jourSemaine(dernier));
  const semaines: string[][] = [];
  for (let jour = debut; jour <= fin; jour = ajouterJours(jour, 7)) {
    semaines.push(Array.from({ length: 7 }, (_, i) => ajouterJours(jour, i)));
  }
  return semaines;
}

/** Mois voisin (« 2026-10 », ±1 → « 2026-11 »). */
export function moisVoisin(mois: string, delta: number): string {
  const [a, m] = mois.split("-").map(Number);
  const d = new Date(Date.UTC(a, m - 1 + delta, 1));
  return d.toISOString().slice(0, 7);
}

/** Nom du mois (« octobre 2026 »). */
export function nomMois(mois: string): string {
  return new Date(`${mois}-15T12:00:00Z`).toLocaleDateString("fr-FR", { timeZone: TZ, month: "long", year: "numeric" });
}
