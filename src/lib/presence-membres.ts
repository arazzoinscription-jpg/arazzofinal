/**
 * Présence des MEMBRES (élèves et équipe) + « ce que je fais en ce moment » — règles PURES.
 * Temps réel (Supabase Realtime Presence) : AUCUNE écriture en base. L'activité choisie est
 * gardée sur l'appareil de l'élève et n'est diffusée que tant qu'elle a le site ouvert.
 * Mode « discrète » : l'élève n'apparaît pas en ligne pour les autres.
 */

export const CANAL_MEMBRES = "arazzo-membres-en-ligne";
export const CLE_MON_ACTIVITE = "arazzo:mon-activite";
/** Une activité choisie s'efface d'elle-même après ce délai (« en ce moment », pas pour toujours). */
export const DUREE_ACTIVITE_MS = 6 * 60 * 60_000;

export const ACTIVITES = ["theorie", "patronage", "couture", "modele"] as const;
export type CodeActivite = (typeof ACTIVITES)[number];

export const LIBELLE_ACTIVITE: Record<CodeActivite, { titre: string; court: string; emoji: string }> = {
  theorie: { titre: "Je regarde le cours théorique", court: "Cours théorique", emoji: "👩‍💻" },
  patronage: { titre: "Je dessine un patron", court: "Patronage", emoji: "📐" },
  couture: { titre: "Je couds à la machine", court: "Couture", emoji: "🧵" },
  modele: { titre: "Mon modèle est en cours", court: "Modèle en cours", emoji: "😊" },
};

export interface MonActivite {
  code: CodeActivite | null;
  /** Avancement du modèle (« Modèle en cours »), par paliers de 10 %. */
  pct: number | null;
  discrete: boolean;
  le: number;
}

/** Ce que chaque membre diffuse (et rien d'autre). */
export interface EtatMembre { activite: CodeActivite | null; pct: number | null }

export const AUCUNE: MonActivite = { code: null, pct: null, discrete: false, le: 0 };

const estCode = (v: unknown): v is CodeActivite => typeof v === "string" && (ACTIVITES as readonly string[]).includes(v);

export function arrondirPct(v: unknown): number | null {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  if (!Number.isFinite(n)) return null;
  return Math.min(100, Math.max(0, Math.round(n / 10) * 10));
}

/** Mon activité, relue depuis l'appareil : invalide ou trop ancienne → aucune (la discrétion, elle, est gardée). */
export function lireMonActivite(brut: string | null, maintenant: number): MonActivite {
  if (!brut) return AUCUNE;
  try {
    const x = JSON.parse(brut) as Partial<MonActivite>;
    const discrete = x.discrete === true;
    const le = typeof x.le === "number" ? x.le : 0;
    if (!estCode(x.code) || maintenant - le > DUREE_ACTIVITE_MS || le > maintenant + 60_000) return { ...AUCUNE, discrete };
    return { code: x.code, pct: x.code === "modele" ? arrondirPct(x.pct) ?? 0 : null, discrete, le };
  } catch {
    return AUCUNE;
  }
}

/** Ce qui est diffusé aux autres : rien du tout si discrète. */
export function chargeDiffusee(a: MonActivite): EtatMembre | null {
  if (a.discrete) return null;
  return { activite: a.code, pct: a.code === "modele" ? a.pct ?? 0 : null };
}

/** Lecture d'un état reçu d'un AUTRE appareil : on ne fait confiance à rien. */
export function lireEtatMembre(brut: unknown): EtatMembre {
  const x = (brut && typeof brut === "object" ? brut : {}) as { activite?: unknown; pct?: unknown };
  const activite = estCode(x.activite) ? x.activite : null;
  return { activite, pct: activite === "modele" ? arrondirPct(x.pct) ?? 0 : null };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** presenceState() → membres en ligne (clé = identifiant du compte ; les visiteurs anonymes sont ignorés). */
export function membresDepuisPresence(etat: Record<string, unknown[]>): Map<string, EtatMembre> {
  const m = new Map<string, EtatMembre>();
  for (const [cle, metas] of Object.entries(etat)) {
    if (!UUID.test(cle) || !Array.isArray(metas) || metas.length === 0) continue;
    m.set(cle.toLowerCase(), lireEtatMembre(metas[metas.length - 1]));
  }
  return m;
}
