/**
 * Suivi pédagogique — lecture paginée SANS troncature silencieuse.
 *
 * PostgREST (Supabase) plafonne chaque réponse à 1 000 lignes, sans erreur ni
 * avertissement : une requête « limit 5000 » en rend 1 000 et a l'air complète.
 * On lit donc page par page, triée sur une clé UNIQUE (pages stables), et on
 * avance du nombre de lignes REÇUES — pas du nombre demandé — jusqu'à une page
 * vide. Ainsi, même si le plafond du serveur est plus bas que la taille de page
 * demandée, rien n'est perdu (coût : une requête de plus, la page vide).
 *
 * Module PUR : la requête est injectée, testable sans base.
 */

export const TAILLE_PAGE = 1000;

/** Nombre maximal de pages lues avant d'abandonner (garde-fou contre une boucle). */
export const PAGES_MAX = 200;

export type LecturePage<T> = (de: number, a: number) => PromiseLike<{
  data: T[] | null;
  error: { message: string } | null;
}>;

export class ErreurLecture extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ErreurLecture";
  }
}

/**
 * Lit toutes les lignes. `complet` est faux si le garde-fou `pagesMax` a coupé
 * la lecture : l'écran doit alors le DIRE, jamais afficher une liste tronquée
 * comme si elle était entière.
 */
export async function lireTout<T>(
  lire: LecturePage<T>,
  { taillePage = TAILLE_PAGE, pagesMax = PAGES_MAX }: { taillePage?: number; pagesMax?: number } = {},
): Promise<{ lignes: T[]; complet: boolean }> {
  const lignes: T[] = [];
  let de = 0;
  for (let page = 0; page < pagesMax; page += 1) {
    // eslint-disable-next-line no-await-in-loop
    const { data, error } = await lire(de, de + taillePage - 1);
    if (error) throw new ErreurLecture(error.message);
    const lot = data ?? [];
    if (lot.length === 0) return { lignes, complet: true };
    lignes.push(...lot);
    de += lot.length;
  }
  return { lignes, complet: false };
}

/** Découpe une liste en paquets (filtres `in.(…)` : une URL trop longue est refusée, erreur 414). */
export function paquets<T>(liste: readonly T[], taille: number): T[][] {
  if (taille <= 0) throw new Error("Taille de paquet invalide");
  const out: T[][] = [];
  for (let i = 0; i < liste.length; i += taille) out.push(liste.slice(i, i + taille));
  return out;
}

/** Identifiants par filtre `in.(…)` : 150 UUID ≈ 5,5 Ko d'adresse (au-delà de quelques centaines → erreur 414). */
export const IDS_PAR_PAQUET = 150;

/**
 * `lireTout` pour un filtre `in.(…)` : les identifiants (dédoublonnés) par paquets, et CHAQUE paquet lu en entier —
 * 150 élèves peuvent avoir bien plus de 1 000 lignes (inscriptions, leçons terminées…). `lire(lot, de, a)` construit
 * la requête du paquet, triée sur une clé unique, finie par `.range(de, a)`. Quelques paquets à la fois.
 * Erreur ou lecture incomplète → `ErreurLecture` (jamais une liste tronquée qui a l'air entière).
 */
export async function lireParIds<T>(
  ids: readonly string[],
  lire: (lot: string[], de: number, a: number) => ReturnType<LecturePage<T>>,
  { taillePaquet = IDS_PAR_PAQUET, enParallele = 4 }: { taillePaquet?: number; enParallele?: number } = {},
): Promise<T[]> {
  const lots = paquets([...new Set(ids)].filter(Boolean), taillePaquet);
  const lignes: T[] = [];
  for (let i = 0; i < lots.length; i += enParallele) {
    // eslint-disable-next-line no-await-in-loop
    const lus = await Promise.all(lots.slice(i, i + enParallele).map((lot) => lireTout<T>((de, a) => lire(lot, de, a))));
    for (const r of lus) {
      if (!r.complet) throw new ErreurLecture("Lecture incomplète (trop de lignes pour un paquet)");
      lignes.push(...r.lignes);
    }
  }
  return lignes;
}
