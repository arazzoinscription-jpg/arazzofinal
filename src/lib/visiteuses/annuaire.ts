/**
 * Annuaire des comptes SANS formation (« visiteuses ») et leurs cours gratuits — règles PURES (testables).
 *
 * Un cours gratuit = une Delivery Page (instantané `delivery_page_snapshots`, poussé par Arazzo OS). Une visiteuse
 * « a » un cours gratuit quand son e-mail figure parmi les inscrits de cette page (`delivery_page_leads`) : par le
 * lien d'inscription (/inscription/<page>) ou par le formulaire de la page (/free/<page>).
 */

export type LeadCours = { slug: string; created_at: string; phone?: string | null; wilaya?: string | null; source?: string | null };
export type InstantaneCours = { slug: string; data: Record<string, unknown> | null };

export interface CoursGratuit {
  slug: string;
  titre: string;
  couverture: string | null;
  /** Date d'inscription de la personne à ce cours (null = cours ouvert, pas encore choisi par elle). */
  inscriteLe: string | null;
  /** Le cours est-il encore en ligne ? (dépublié → on le montre à l'équipe, pas à la visiteuse). */
  enLigne: boolean;
  /** Lien qui ouvre le cours sans redemander le formulaire. */
  lien: string;
}

const texte = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);

/** La couverture d'un cours : sa photo, sinon l'image de sa vidéo YouTube. */
export function couvertureCours(data: Record<string, unknown> | null): string | null {
  const photo = texte(data?.cover_image_url);
  if (photo) return photo;
  const m = String(data?.cover_video_url ?? "").match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([\w-]{11})/i);
  return m ? `https://img.youtube.com/vi/${m[1]}/hqdefault.jpg` : null;
}

/**
 * Les cours gratuits d'une personne (les plus récents d'abord), puis — si `avecLesAutres` — les autres cours gratuits
 * en ligne, qu'elle peut aussi ouvrir. Une page fermée « déplacée » (ancienne adresse) n'est jamais un cours.
 */
export function fusionnerCoursGratuits(leads: LeadCours[], instantanes: InstantaneCours[], { avecLesAutres = false } = {}): CoursGratuit[] {
  const parSlug = new Map(instantanes.map((s) => [s.slug, s.data]));
  const premiereFois = new Map<string, string>();
  for (const l of leads) {
    const avant = premiereFois.get(l.slug);
    if (!avant || l.created_at < avant) premiereFois.set(l.slug, l.created_at);
  }
  const cours = (slug: string, inscriteLe: string | null): CoursGratuit | null => {
    const data = parSlug.get(slug) ?? null;
    if (data && data.status === "moved") return null;
    return {
      slug,
      titre: texte(data?.title) ?? slug.replace(/-/g, " "),
      couverture: couvertureCours(data),
      inscriteLe,
      enLigne: data?.active === true,
      lien: `/free/${encodeURIComponent(slug)}?acces=1`,
    };
  };
  const siens = [...premiereFois.entries()]
    .sort((a, b) => b[1].localeCompare(a[1]))
    .map(([slug, le]) => cours(slug, le))
    .filter((c): c is CoursGratuit => c !== null);
  if (!avecLesAutres) return siens;
  const deja = new Set(siens.map((c) => c.slug));
  const autres = instantanes
    .filter((s) => !deja.has(s.slug) && s.data?.active === true)
    .map((s) => cours(s.slug, null))
    .filter((c): c is CoursGratuit => c !== null);
  return [...siens, ...autres];
}

/**
 * Numéro pour WhatsApp / appel, au format international algérien quand il est écrit à la locale
 * (« 0555 12 34 56 » → 213555123456). Vide → null.
 */
export function telephoneInternational(brut: string | null | undefined): string | null {
  let d = String(brut ?? "").replace(/\D/g, "");
  if (!d) return null;
  if (d.startsWith("00")) d = d.slice(2);
  if (d.length === 10 && d.startsWith("0")) return `213${d.slice(1)}`;
  if (d.length === 9 && /^[5-7]/.test(d)) return `213${d}`;
  return d;
}

export type Periode = "tout" | "1" | "7" | "30";
export function lirePeriodeAnnuaire(v: unknown): Periode {
  return v === "1" || v === "7" || v === "30" ? v : "tout";
}

export type FicheAnnuaire = { id: string; nom: string | null; email: string | null; ville: string | null; created_at: string };

/** Recherche (nom, e-mail, ville — sans accents ni majuscules) et période de création du compte ; plus récentes d'abord. */
export function filtrerAnnuaire<T extends FicheAnnuaire>(liste: T[], { q = "", periode = "tout" as Periode, maintenant = Date.now() } = {}): T[] {
  const plat = (s: string | null | undefined) => (s ?? "").normalize("NFD").replace(/\p{M}+/gu, "").toLowerCase();
  const mots = plat(q).split(/\s+/).filter(Boolean);
  const depuis = periode === "tout" ? -Infinity : maintenant - Number(periode) * 86_400_000;
  return liste
    .filter((v) => new Date(v.created_at).getTime() >= depuis)
    .filter((v) => {
      if (!mots.length) return true;
      const tout = `${plat(v.nom)} ${plat(v.email)} ${plat(v.ville)}`;
      return mots.every((m) => tout.includes(m));
    })
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export const PAR_PAGE = 50;

/** Une page de la liste (numérotée à partir de 1, ramenée dans les bornes). */
export function pageDe<T>(liste: T[], brut: unknown, parPage = PAR_PAGE): { lignes: T[]; page: number; pages: number } {
  const pages = Math.max(1, Math.ceil(liste.length / parPage));
  const n = Number.parseInt(String(brut ?? "1"), 10);
  const page = Math.min(pages, Math.max(1, Number.isFinite(n) ? n : 1));
  return { lignes: liste.slice((page - 1) * parPage, page * parPage), page, pages };
}
