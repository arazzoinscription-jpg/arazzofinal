/**
 * Suivi pédagogique — reconnaître les niveaux SANS rien attribuer au hasard.
 *
 * Deux structures coexistent dans le LMS (vérifié dans le code) :
 *
 *  - les trois COURS DE NIVEAU, dont les identifiants sont ceux de
 *    `src/lib/niveaux.ts` (mêmes que les landings et que la configuration de
 *    l'OS) ;
 *  - les ANCIENS COURS-MODULES (« المحور N », cours TutorLMS importés).
 *    `scripts/build-levels.mjs` a RECOPIÉ leurs leçons dans les cours de niveau,
 *    sous de nouveaux identifiants, et `scripts/organize-student-levels.mjs` a
 *    inscrit les élèves migrées aux deux.
 *
 * Règles (décision de l'administratrice, 2026-10-13) :
 *  - le niveau d'une élève n'est CONFIRMÉ que par son inscription à l'un des
 *    trois cours de niveau ;
 *  - un ancien module est reconnu comme tel, affiché à part dans l'historique,
 *    et ne reçoit AUCUN niveau ;
 *  - la progression d'un ancien module n'est jamais additionnée à celle d'un
 *    cours de niveau (ce serait compter deux fois les mêmes leçons).
 *
 * Module PUR : aucun accès réseau ni base.
 */

import { NIVEAUX } from "../niveaux";

export type CodeNiveau = "N1" | "N2" | "N3";
export type GenreCours = "niveau" | "ancien_module" | "autre";

const CODE_PAR_SLUG_LANDING: Record<string, CodeNiveau> = {
  "niveau-1": "N1",
  "niveau-2": "N2",
  "niveau-3": "N3",
};

/** Identifiant de cours LMS → niveau, d'après `src/lib/niveaux.ts` uniquement. */
export const NIVEAU_PAR_COURS: ReadonlyMap<string, CodeNiveau> = new Map(
  Object.entries(NIVEAUX).flatMap(([slug, id]) =>
    CODE_PAR_SLUG_LANDING[slug] ? [[id, CODE_PAR_SLUG_LANDING[slug]] as [string, CodeNiveau]] : [],
  ),
);

/**
 * Identifiants TutorLMS des anciens cours-modules recopiés dans les cours de
 * niveau — copie conforme des listes `members` de `scripts/build-levels.mjs`
 * (vérifiée par `levels.test.ts` quand ce script, exclu de git, est présent).
 * Servent UNIQUEMENT à reconnaître un ancien module ; jamais à lui donner un niveau.
 */
export const IDS_TUTOR_ANCIENS_MODULES: ReadonlySet<number> = new Set([
  6630, 3185, 3145, 6618, 3177, 3167, 3173, 3179, 3175,
  6547, 5179, 5190,
  3305, 3209, 3260, 3193, 3184, 3187, 3189, 3401, 3339,
]);

const TITRE_MODULE = /المحور\s*\d+/;

export interface CoursAClasser {
  course_id: string;
  course_slug: string | null;
  course_titre_fr: string | null;
  course_titre_ar: string | null;
}

/** Nature d'un cours pour le suivi : cours de niveau, ancien module ou autre formation. */
export function classerCours(c: CoursAClasser): { genre: GenreCours; niveau: CodeNiveau | null } {
  const niveau = NIVEAU_PAR_COURS.get(c.course_id) ?? null;
  if (niveau) return { genre: "niveau", niveau };
  if (TITRE_MODULE.test(c.course_titre_ar ?? "") || TITRE_MODULE.test(c.course_titre_fr ?? "")) {
    return { genre: "ancien_module", niveau: null };
  }
  const fin = String(c.course_slug ?? "").match(/-(\d+)$/);
  if (fin && IDS_TUTOR_ANCIENS_MODULES.has(Number(fin[1]))) return { genre: "ancien_module", niveau: null };
  return { genre: "autre", niveau: null };
}
