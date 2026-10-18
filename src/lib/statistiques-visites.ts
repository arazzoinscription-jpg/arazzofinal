/**
 * Statistiques « qui est venu » (site + La Cour) — règles PURES (testables), à partir des pages vues (`page_visits`).
 *
 * Une personne connectée est reconnue par `user_id` (posé côté serveur par /api/track). Ses visites d'AVANT la
 * connexion (même navigateur → même `session_id`) lui sont rattachées aussi, sauf si plusieurs comptes ont
 * utilisé ce navigateur (ordinateur partagé) : dans le doute, on ne rattache pas.
 */

export type Visite = {
  path: string;
  source: string | null;
  session_id: string | null;
  user_id: string | null;
  duration_sec: number | null;
  device: string | null;
  created_at: string;
};

export type Periode = 1 | 7 | 30;
export const PERIODES: { jours: Periode; libelle: string }[] = [
  { jours: 1, libelle: "24 h" },
  { jours: 7, libelle: "7 jours" },
  { jours: 30, libelle: "30 jours" },
];
export function lirePeriode(v: unknown): Periode {
  return v === "1" ? 1 : v === "30" ? 30 : 7;
}

/** Au-delà de 30 min sans page vue, la personne est repartie : la page suivante ouvre une nouvelle visite. */
export const PAUSE_NOUVELLE_VISITE_MS = 30 * 60_000;
/** « En ce moment » = une page vue dans les 10 dernières minutes. */
export const FENETRE_EN_LIGNE_MS = 10 * 60_000;

export function estDansLaCour(path: string): boolean {
  return path === "/communaute" || path.startsWith("/communaute/");
}

const PREMIER: Record<string, string> = {
  dashboard: "Tableau de bord", formations: "Formations", formation: "Formation", offres: "Offres", offre: "Offre",
  free: "Cours gratuit", inscription: "Inscription", login: "Connexion", register: "Inscription", pack: "Pack",
  presentiel: "Présentiel", patrons: "Patrons", boutique: "Boutique", "mon-espace": "Mon espace", certificat: "Certificat",
  contact: "Contact", blog: "Blog", consultation: "Consultation",
};
const COUR: Record<string, string> = {
  u: "un profil", actualites: "actualités", groupes: "groupes", live: "live", publier: "publier", profil: "mon profil",
};
const RESSEMBLE_A_UN_ID = /^[0-9a-f-]{20,}$/i;

/** Nom lisible d'une page (« La Cour (feed) », « Tableau de bord · patrons »…). */
export function libellePage(path: string): string {
  const segs = path.split("?")[0].split("/").filter(Boolean);
  if (!segs.length) return "Accueil";
  if (segs[0] === "communaute") return segs.length === 1 ? "La Cour (feed)" : `La Cour · ${COUR[segs[1]] ?? segs[1]}`;
  if (segs[0] === "cours") return "Un cours (leçon)";
  const base = PREMIER[segs[0]];
  if (!base) return path;
  if (segs.length === 1 || RESSEMBLE_A_UN_ID.test(segs[1])) return base;
  let suite = segs[1];
  try { suite = decodeURIComponent(suite); } catch { /* tel quel */ }
  return `${base} · ${suite.replace(/-/g, " ")}`;
}

/** « à l'instant », « il y a 5 min », « il y a 3 h », « il y a 2 j », puis la date. */
export function ilYa(iso: string, maintenant: number): string {
  const ms = maintenant - new Date(iso).getTime();
  const min = Math.floor(ms / 60_000);
  if (min < 1) return "à l'instant";
  if (min < 60) return `il y a ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `il y a ${h} h`;
  const j = Math.floor(h / 24);
  if (j < 7) return `il y a ${j} j`;
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", timeZone: "Africa/Algiers" });
}

/** Navigateur → compte, seulement quand UN seul compte s'y est connecté. */
export function comptesParNavigateur(rows: Visite[]): Map<string, string> {
  const vus = new Map<string, Set<string>>();
  for (const r of rows) {
    if (!r.session_id || !r.user_id) continue;
    const s = vus.get(r.session_id) ?? new Set<string>();
    s.add(r.user_id);
    vus.set(r.session_id, s);
  }
  const out = new Map<string, string>();
  for (const [sid, users] of vus) if (users.size === 1) out.set(sid, [...users][0]);
  return out;
}

/** La personne derrière une page vue (connectée, ou reconnue par son navigateur) ; null = visiteur sans compte. */
export function personneDe(r: Visite, navigateurs: Map<string, string>): string | null {
  return r.user_id ?? (r.session_id ? navigateurs.get(r.session_id) ?? null : null);
}

/** Nombre de visites dans une suite de pages vues (triées), coupées par 30 min de pause. */
export function compterVisites(instants: number[]): number {
  let n = 0;
  let precedent = -Infinity;
  for (const t of instants) {
    if (t - precedent > PAUSE_NOUVELLE_VISITE_MS) n++;
    precedent = t;
  }
  return n;
}

export interface Personne {
  userId: string;
  derniere: string;
  dernierePage: string;
  vues: number;
  visites: number;
  tempsSec: number;
  /** D'où elle est arrivée sur le site la 1re fois dans la période (« direct » si on ne sait pas). */
  source: string;
  appareil: "mobile" | "desktop";
  vuesCour: number;
  visitesCour: number;
  tempsCourSec: number;
  derniereCour: string | null;
}

export interface Anonymes {
  visiteurs: number;
  vues: number;
  visiteursCour: number;
  vuesCour: number;
  sources: { source: string; n: number }[];
}

const cleVisiteur = (r: Visite, i: number) => (r.session_id && r.session_id !== "anon" ? r.session_id : `#${i}`);

/**
 * Qui est venu depuis `depuis` : les personnes connectées (plus récente d'abord) et le total des visiteurs sans compte.
 * `rows` = TOUTES les pages vues chargées (pour reconnaître les navigateurs), `exclure` = l'équipe à ne pas compter.
 */
export function quiEstVenu(rows: Visite[], opts: { depuis: number; exclure?: Set<string> }): { personnes: Personne[]; anonymes: Anonymes } {
  const navigateurs = comptesParNavigateur(rows);
  const dansPeriode = rows
    .map((r, i) => ({ r, i, t: new Date(r.created_at).getTime() }))
    .filter((x) => x.t >= opts.depuis)
    .sort((a, b) => a.t - b.t);

  const parPersonne = new Map<string, typeof dansPeriode>();
  const anonymes = new Map<string, typeof dansPeriode>();
  for (const x of dansPeriode) {
    const qui = personneDe(x.r, navigateurs);
    if (qui && opts.exclure?.has(qui)) continue;
    const cible = qui ? parPersonne : anonymes;
    const cle = qui ?? cleVisiteur(x.r, x.i);
    const liste = cible.get(cle) ?? [];
    liste.push(x);
    cible.set(cle, liste);
  }

  const premiereSource = (liste: typeof dansPeriode) => liste.find((x) => x.r.source && x.r.source !== "internal")?.r.source ?? "direct";

  const personnes: Personne[] = [...parPersonne.entries()].map(([userId, liste]) => {
    const cour = liste.filter((x) => estDansLaCour(x.r.path));
    const derniere = liste[liste.length - 1];
    return {
      userId,
      derniere: derniere.r.created_at,
      dernierePage: derniere.r.path,
      vues: liste.length,
      visites: compterVisites(liste.map((x) => x.t)),
      tempsSec: liste.reduce((s, x) => s + (x.r.duration_sec ?? 0), 0),
      source: premiereSource(liste),
      appareil: derniere.r.device === "mobile" ? "mobile" : "desktop",
      vuesCour: cour.length,
      visitesCour: compterVisites(cour.map((x) => x.t)),
      tempsCourSec: cour.reduce((s, x) => s + (x.r.duration_sec ?? 0), 0),
      derniereCour: cour.length ? cour[cour.length - 1].r.created_at : null,
    };
  });
  personnes.sort((a, b) => b.derniere.localeCompare(a.derniere));

  const sources = new Map<string, number>();
  let vues = 0, visiteursCour = 0, vuesCour = 0;
  for (const liste of anonymes.values()) {
    vues += liste.length;
    const cour = liste.filter((x) => estDansLaCour(x.r.path)).length;
    vuesCour += cour;
    if (cour) visiteursCour++;
    const s = premiereSource(liste);
    sources.set(s, (sources.get(s) ?? 0) + 1);
  }

  return {
    personnes,
    anonymes: {
      visiteurs: anonymes.size,
      vues,
      visiteursCour,
      vuesCour,
      sources: [...sources.entries()].map(([source, n]) => ({ source, n })).sort((a, b) => b.n - a.n),
    },
  };
}

/** Celles et ceux qui ont vu une page dans les 10 dernières minutes. */
export function enCeMoment(rows: Visite[], opts: { maintenant: number; exclure?: Set<string> }): {
  personnes: string[]; personnesCour: string[]; anonymes: number; anonymesCour: number;
} {
  const { personnes, anonymes } = quiEstVenu(rows, { depuis: opts.maintenant - FENETRE_EN_LIGNE_MS, exclure: opts.exclure });
  return {
    personnes: personnes.map((p) => p.userId),
    personnesCour: personnes.filter((p) => p.derniereCour && opts.maintenant - new Date(p.derniereCour).getTime() <= FENETRE_EN_LIGNE_MS).map((p) => p.userId),
    anonymes: anonymes.visiteurs,
    anonymesCour: anonymes.visiteursCour,
  };
}
