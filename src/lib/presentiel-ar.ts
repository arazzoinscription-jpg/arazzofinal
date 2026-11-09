/**
 * Traductions COURTES en arabe des champs présentiels saisis en français dans l'OS
 * (durées, horaires, formules, prix) — pour que la landing /presentiel/[slug]
 * s'ouvre entièrement en arabe simple (09/11). Les données d'origine ne changent pas.
 */

const LRI = "⁦";
const PDI = "⁩";
/** Isole un nombre / une plage horaire pour qu'il ne se retourne pas en RTL. */
const iso = (s: string) => `${LRI}${s}${PDI}`;

const JOURS: Record<string, string> = {
  samedi: "السبت", dimanche: "الأحد", lundi: "الإثنين", mardi: "الثلاثاء",
  mercredi: "الأربعاء", jeudi: "الخميس", vendredi: "الجمعة",
};
const APRES_MIDI = /apr[eéè]s?[\s-]*midi/i;

/** « 4 mois » → « 4 أشهر » ; « 6 mois et demi » → « 6 أشهر ونصف ». Déjà en arabe → tel quel. */
export function dureeAr(s: unknown): string | null {
  const x = String(s ?? "").trim();
  if (!x) return null;
  const m = x.match(/(\d+)\s*mois(\s*et\s*demi)?/i);
  if (m) return `${iso(m[1])} أشهر${m[2] ? " ونصف" : ""}`;
  return /[؀-ۿ]/.test(x) ? x.replace(/اشهر/g, "أشهر") : null;
}

/** « 4 000 DA / mois » → « 4000 دج/شهر ». */
export function prixAr(s: unknown): string | null {
  const x = String(s ?? "");
  const m = x.replace(/(\d)[\s  .](?=\d{3}\b)/g, "$1").match(/\d+/);
  if (!m) return null;
  return `${iso(m[0])} دج${/mois|شهر/i.test(x) ? "/شهر" : ""}`;
}

/** Le jour + moment d'un groupe : `jeudi-apres-midi`, « samedi apré-midi »… → « الخميس مساءً ». */
export function creneauAr(slot: unknown, day?: unknown, period?: unknown): string | null {
  const x = `${String(slot ?? "")} ${String(day ?? "")} ${String(period ?? "")}`.toLowerCase();
  const jour = Object.keys(JOURS).find((j) => x.includes(j));
  const moment = APRES_MIDI.test(x) ? "مساءً" : /matin/.test(x) ? "صباحًا" : /soir/.test(x) ? "ليلاً" : "";
  return jour ? `${JOURS[jour]}${moment ? ` ${moment}` : ""}` : null;
}

/** La méthode d'une formule : accélérée ou longue durée. */
export function methodeAr(label: unknown, id?: unknown): string | null {
  const x = `${String(label ?? "")} ${String(id ?? "")}`.toLowerCase();
  if (/accél|courte|rapide|مكثف|مسرع|قصيرة|\bm4\b/.test(x)) return "⚡ مسرّعة";
  if (/longue|طويلة|\bm65\b/.test(x)) return "🌿 مدة طويلة";
  return null;
}

/** « Matin 8h30–12h · Après-midi 12h30–16h » → « صباحًا 8:30–12:00 · مساءً 12:30–16:00 ». */
export function horaireAr(s: unknown): string | null {
  const x = String(s ?? "").trim();
  if (!x) return null;
  const heure = (h: string, mn?: string) => `${h}:${(mn ?? "00").padStart(2, "0")}`;
  const plages: string[] = [];
  const re = /(\d{1,2})\s*[h:]\s*(\d{2})?\s*h?\s*[–—-]\s*(\d{1,2})\s*[h:]?\s*(\d{2})?/g;
  // Découpe par moment de la journée pour garder « صباحًا / مساءً » devant chaque plage.
  const morceaux = x.split(/(?=matin|apr[eéè]s?[\s-]*midi|soir)/i);
  for (const mo of morceaux) {
    const moment = APRES_MIDI.test(mo) ? "مساءً" : /matin/i.test(mo) ? "صباحًا" : /soir/i.test(mo) ? "ليلاً" : "";
    const ps = [...mo.matchAll(re)].map((m) => iso(`${heure(m[1], m[2])}–${heure(m[3], m[4])}`));
    if (ps.length) plages.push(`${moment ? `${moment} ` : ""}${ps.join(" أو ")}`);
  }
  return plages.length ? plages.join(" · ") : null;
}

/** « 3h30 / séance » → « 3:30 سا للحصة ». */
export function seanceAr(s: unknown): string | null {
  const m = String(s ?? "").match(/(\d{1,2})\s*h\s*(\d{2})?/i);
  return m ? `${iso(`${m[1]}:${(m[2] ?? "00").padStart(2, "0")}`)} سا للحصة` : null;
}
