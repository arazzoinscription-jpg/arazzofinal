import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { createPublicClient } from "@/lib/supabase/public";
import { groupesOuverts } from "@/lib/groupes-places-load";

/**
 * Données des landings ARABES par niveau (/niveaux, /niveaux/[niveau]) — 09/11.
 * Tout est LU (cours du LMS, leçons, groupe en ligne ouvert, offres présentielles
 * synchronisées par l'OS) puis traduit en arabe simple : jour, matin/après-midi,
 * méthode (accélérée / longue durée), horaire, durée de séance, prix au mois, places.
 * Aucune écriture, aucune donnée personnelle.
 */

export const NIVEAUX_AR = [
  {
    slug: "niveau-1", id: "23bee490-103a-492d-9253-256178658e02", rang: 1, icone: "🌱", couleur: "#128a4c",
    pour: "للمبتدئات — من الصفر", promesse: "من أول غرزة إلى أول قطعة تخيطيها بيديكِ",
    resultats: ["أخذ المقاسات", "الباترون الأساسي", "فساتين البيت", "الحجابات", "السروال", "التنورة"],
  },
  {
    slug: "niveau-2", id: "b100190c-4f95-4f63-bd22-7a561f9666de", rang: 2, icone: "🌸", couleur: "#5B16F9",
    pour: "عندكِ الأساسيات", promesse: "الملابس الكلاسيكية وفساتين السهرة",
    resultats: ["ملابس كلاسيكية", "فساتين السهرة", "تشطيب احترافي"],
  },
  {
    slug: "niveau-3", id: "de1da439-6dc9-4cf0-9526-e44af4c5073b", rang: 3, icone: "👑", couleur: "#FE7223",
    pour: "متقدمة", promesse: "ماستر كلاس فساتين السهرة: من الكورسيه إلى الهوت كوتور",
    resultats: ["الكورسيه", "فساتين السهرة", "قطع معقدة"],
  },
] as const;

export type NiveauMeta = (typeof NIVEAUX_AR)[number];

export type GroupeAr = {
  id: string; jour: string | null; periode: string | null; methode: "rapide" | "longue" | null;
  horaire: string | null; seance: string | null; duree: string | null; prixMois: string | null;
  restantes: number | null; total: number | null; prises: number | null;
};
export type CentreAr = {
  slug: string; lieu: "setif" | "eulma"; ville: string; adresse: string | null; carte: string | null;
  video: string | null; dossier: string[]; prixMoisMin: string | null; groupes: GroupeAr[];
};
export type ChapitreAr = { titre: string; mois: number | null; lecons: string[] };
export type NiveauAr = {
  meta: NiveauMeta; titre: string; description: string | null; image: string | null; galerie: string[];
  prixEnLigne: string | null; lecons: number; heures: number | null; mois: number | null; chapitres: ChapitreAr[];
  enLigne: { ouvert: boolean; nom: string | null; debut: string | null; restantes: number | null; total: number | null } | null;
  centres: CentreAr[];
};

/* ───────────── Traductions simples ───────────── */

const JOURS: [RegExp, string][] = [
  [/samedi|sam[ée]?di|samdi/i, "السبت"], [/dimanche/i, "الأحد"], [/lundi/i, "الاثنين"], [/mardi/i, "الثلاثاء"],
  [/mercredi/i, "الأربعاء"], [/jeudi/i, "الخميس"], [/vendredi/i, "الجمعة"],
];
const APRES_MIDI = /apr[eéè]s?[\s-]*midi|مساء/i;
const MATIN = /matin|صباح/i;

export const dzd = (n: number | null | undefined) =>
  // Le nombre isolé (LRI…PDI) : sans espace de milliers (« 2 800 » s'affichait « 800 2 » en arabe).
  n ? `\u2066${Math.round(Number(n))}\u2069 دج` : null;

function jourAr(t: string | null | undefined): string | null {
  const s = String(t ?? "");
  for (const [re, ar] of JOURS) if (re.test(s)) return ar;
  return null;
}
function periodeDe(...textes: (string | null | undefined)[]): "matin" | "apres-midi" | null {
  const s = textes.filter(Boolean).join(" ");
  if (APRES_MIDI.test(s)) return "apres-midi";
  if (MATIN.test(s)) return "matin";
  return null;
}
/** « 6 mois et demi » → « 6 أشهر ونصف » ; l'arabe passe tel quel. */
export function dureeAr(t: string | null | undefined): string | null {
  const s = String(t ?? "").trim();
  if (!s) return null;
  if (/[؀-ۿ]/.test(s) && !/mois/i.test(s)) return s.replace(/\s+/g, " ").replace("اشهر", "أشهر");
  const n = s.match(/\d+/)?.[0];
  if (!n) return null;
  const demi = /demi|½|\.5/.test(s);
  const unite = Number(n) <= 10 && Number(n) >= 3 ? "أشهر" : "شهر";
  return `${n} ${unite}${demi ? " ونصف" : ""}`;
}
const hm = (h: string, m?: string) => `${Number(h)}:${(m ?? "00").padStart(2, "0")}`;
/** Les plages horaires d'un texte libre : « 8h–10:30h ou bien 11h – 13h30 » → « 8:00–10:30 أو 11:00–13:30 ». */
function plages(t: string): string[] {
  const re = /(\d{1,2})(?:[h:](\d{2}))?h?\s*[–—-]\s*(\d{1,2})(?:[h:](\d{2}))?h?/g;
  const out: string[] = [];
  for (const m of t.matchAll(re)) out.push(`\u2066${hm(m[1], m[2])}–${hm(m[3], m[4])}\u2069`);
  return out;
}
/** Horaire d'une formule pour la période du groupe (matin / après-midi), sinon toutes les plages. */
function horaireAr(schedule: string | null | undefined, periode: "matin" | "apres-midi" | null): string | null {
  const s = String(schedule ?? "");
  if (!s.trim()) return null;
  const iAp = s.search(APRES_MIDI);
  let morceau = s;
  if (periode === "apres-midi" && iAp >= 0) morceau = s.slice(iAp);
  else if (periode === "matin" && iAp > 0) morceau = s.slice(0, iAp);
  const p = plages(morceau);
  return p.length ? p.join(" أو ") : null;
}
/** « 3h30 / séance » → « 3 سا 30 د ». */
function seanceAr(t: string | null | undefined): string | null {
  const m = String(t ?? "").match(/(\d{1,2})\s*h\s*(\d{2})?/i);
  if (!m) return null;
  return m[2] && m[2] !== "00" ? `${Number(m[1])} سا ${Number(m[2])} د` : `${Number(m[1])} ساعات`;
}
function prixMoisAr(t: string | null | undefined): number | null {
  const n = String(t ?? "").replace(/[\s  ]/g, "").match(/\d{3,6}/)?.[0];
  return n ? Number(n) : null;
}
function methodeDe(f: Record<string, any> | null | undefined): "rapide" | "longue" | null {
  const s = `${f?.id ?? ""} ${f?.label ?? ""} ${f?.session_duration ?? ""}`;
  if (/court|acc[ée]l|m4\b|قصيرة|مسرّعة/i.test(s)) return "rapide";
  if (/long|m65|طويلة/i.test(s)) return "longue";
  return null;
}
const chiffres = (t: unknown) => String(t ?? "").replace(/\D+/g, "");
/** La formule d'un groupe : par id, par libellé, par durée, sinon l'unique formule. */
function formuleDe(formules: Record<string, any>[], g: Record<string, any>): Record<string, any> | null {
  if (!formules.length) return null;
  const parId = formules.find((f) => g.formula_id && f.id === g.formula_id);
  if (parId) return parId;
  const lab = String(g.formula_label ?? "").trim();
  const parLabel = lab && formules.find((f) => String(f.label ?? "").trim() === lab);
  if (parLabel) return parLabel;
  const d = chiffres(g.formula_label) || chiffres(g.duration_label);
  const parDuree = d && formules.find((f) => chiffres(f.duration_label) === d);
  if (parDuree) return parDuree;
  const parNom = formules.find((f) => methodeDe(f) && methodeDe(f) === methodeDe({ label: g.name }));
  if (parNom) return parNom;
  return formules.length === 1 ? formules[0] : null;
}
const nettoyer = (t: string) => t.replace(/\*+/g, "").replace(/\s+/g, " ").trim();
/** « Copie … * نسخة … » → la partie arabe. */
function partieArabe(t: string): string {
  const morceaux = t.split("*").map(nettoyer).filter(Boolean);
  return morceaux.find((m) => /[؀-ۿ]/.test(m)) ?? nettoyer(t);
}

/* ───────────── Lecture ───────────── */

function centreDe(slug: string, d: Record<string, any>): CentreAr {
  const lieu: "setif" | "eulma" = d.location === "eulma" || /eulma|علمة/i.test(String(d.city ?? "")) ? "eulma" : "setif";
  const formules: Record<string, any>[] = Array.isArray(d.formulas) ? d.formulas : [];
  const brut: Record<string, any>[] = Array.isArray(d.groups_open) && d.groups_open.length
    ? d.groups_open : d.seats?.group ? [{ id: "g", ...d.seats }] : [];
  const groupes: GroupeAr[] = brut.filter((x) => x?.group_open !== false).map((x) => {
    const g = x.group ?? {};
    const f = formuleDe(formules, g);
    const periode = periodeDe(g.period === "apres-midi" ? "après-midi" : g.period, g.slot, g.day, g.name);
    return {
      id: String(x.id ?? g.slot ?? Math.random()),
      jour: jourAr(g.day ?? g.slot ?? g.name),
      periode: periode === "apres-midi" ? "مساءً" : periode === "matin" ? "صباحًا" : null,
      methode: methodeDe(f) ?? methodeDe({ label: g.name }),
      horaire: horaireAr(f?.schedule_label, periode),
      seance: seanceAr(f?.session_duration),
      duree: dureeAr(g.duration_label || f?.duration_label),
      prixMois: dzd(prixMoisAr(f?.price_label)),
      restantes: typeof x.left === "number" ? Math.max(0, x.left) : null,
      total: typeof x.total === "number" ? x.total : null,
      prises: typeof x.taken === "number" ? x.taken : null,
    };
  });
  const prixFormules = formules.map((f) => prixMoisAr(f.price_label)).filter((n): n is number => !!n);
  const center = d.center ?? {};
  return {
    slug, lieu, ville: lieu === "eulma" ? "العلمة" : "سطيف",
    adresse: center.address ? nettoyer(String(center.address)) : null,
    carte: center.maps_url ?? null, video: center.location_video_url ?? null,
    dossier: (Array.isArray(center.dossier_items) ? center.dossier_items : []).map((t: string) => partieArabe(String(t))).filter(Boolean),
    prixMoisMin: dzd(prixFormules.length ? Math.min(...prixFormules) : d.price_month ?? null),
    groupes,
  };
}

/** Les offres présentielles « formation » d'un niveau (Sétif d'abord). */
async function centresDuNiveau(niveau: string): Promise<CentreAr[]> {
  try {
    const { data } = await createPublicClient().from("presentiel_snapshots").select("slug, data");
    return ((data as { slug: string; data: Record<string, any> | null }[]) ?? [])
      .filter((r) => r.data && r.data.level === niveau && (r.data.kind ?? "formation") === "formation")
      .map((r) => centreDe(r.slug, r.data!))
      .sort((a, b) => (a.lieu === "setif" ? -1 : 1) - (b.lieu === "setif" ? -1 : 1));
  } catch { return []; }
}

export async function resumeNiveaux() {
  const admin = createAdminClient();
  const { data: courses } = await admin.from("courses").select("id, titre_ar, prix_dzd, thumbnail").in("id", NIVEAUX_AR.map((n) => n.id));
  const parId = new Map((courses ?? []).map((c: any) => [c.id, c]));
  return Promise.all(NIVEAUX_AR.map(async (meta) => {
    const c: any = parId.get(meta.id) ?? {};
    const centres = await centresDuNiveau(meta.slug);
    const mins = centres.map((x) => prixMoisAr(x.prixMoisMin)).filter((n): n is number => !!n);
    return {
      meta, titre: titreCourt(c.titre_ar, meta.rang), image: c.thumbnail ?? null,
      prixEnLigne: dzd(c.prix_dzd), prixPresentiel: dzd(mins.length ? Math.min(...mins) : null),
      villes: [...new Set(centres.map((x) => x.ville))],
    };
  }));
}

const RANGS = ["", "الأول", "الثاني", "الثالث"];
/** « المستوى الأول — الأساسيات … » → « الأساسيات … » (le rang est affiché à part). */
function titreCourt(t: string | null | undefined, rang: number) {
  const s = nettoyer(String(t ?? ""));
  const sans = s.replace(/^المستوى\s+\S+\s*[—–-]\s*/, "");
  return sans || `المستوى ${RANGS[rang]}`;
}

export async function niveauAr(slug: string): Promise<NiveauAr | null> {
  const meta = NIVEAUX_AR.find((n) => n.slug === slug);
  if (!meta) return null;
  const admin = createAdminClient();
  const { data: c } = await admin.from("courses")
    .select("titre_ar, description_ar, prix_dzd, thumbnail, gallery, duration_months").eq("id", meta.id).maybeSingle();
  const { data: chs } = await admin.from("chapters").select("id, titre, ordre, unlock_month").eq("course_id", meta.id).order("ordre");
  const ids = (chs ?? []).map((x: any) => x.id);
  const { data: ls } = ids.length
    ? await admin.from("lessons").select("chapter_id, titre, ordre, duree_minutes").in("chapter_id", ids).order("ordre")
    : { data: [] as any[] };
  const lecons = (ls ?? []) as { chapter_id: string; titre: string | null; duree_minutes: number | null }[];
  const chapitres: ChapitreAr[] = (chs ?? []).map((x: any) => ({
    titre: nettoyer(String(x.titre ?? "")).replace(/^المحور\s*\d*\s*[:：.-]?\s*/, "") || "محور",
    mois: x.unlock_month ?? null,
    lecons: lecons.filter((l) => l.chapter_id === x.id).map((l) => nettoyer(String(l.titre ?? ""))).filter(Boolean),
  }));
  const minutes = lecons.reduce((s, l) => s + (Number(l.duree_minutes) || 0), 0);
  const groupes = await groupesOuverts(admin, meta.id).catch(() => []);
  const g = groupes[0];
  const debutFutur = g?.debut && new Date(g.debut).getTime() > Date.now() ? g.debut : null;
  const c2: any = c ?? {};
  return {
    meta, titre: titreCourt(c2.titre_ar, meta.rang), description: c2.description_ar ? nettoyer(c2.description_ar) : null,
    image: c2.thumbnail ?? null, galerie: Array.isArray(c2.gallery) ? c2.gallery.slice(0, 12) : [],
    prixEnLigne: dzd(c2.prix_dzd), lecons: lecons.length, heures: minutes >= 60 ? Math.round(minutes / 60) : null,
    mois: Math.max(0, ...chapitres.map((x) => x.mois ?? 0)) || c2.duration_months || null,
    chapitres,
    enLigne: g ? {
      ouvert: true, nom: g.nom, debut: debutFutur,
      restantes: g.capacite ? Math.max(0, g.capacite - g.prises) : null, total: g.capacite ?? null,
    } : null,
    centres: await centresDuNiveau(slug),
  };
}
