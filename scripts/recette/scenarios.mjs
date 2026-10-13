/**
 * Scénarios FICTIFS du suivi pédagogique (recette uniquement) et résultats attendus.
 * Partagés par seed-student-care.mjs (création) et verifier-student-care.mjs (contrôle).
 * Aucune donnée réelle : adresses en @exemple.test, noms « Élève recette ».
 *
 * Lancer avec tsx (import des modules TypeScript du suivi).
 */

import { NIVEAUX } from "../../src/lib/niveaux.ts";
import { jourAlger, minuitAlgerIso } from "../../src/lib/student-care/time.ts";

export const DOMAINE = "exemple.test";
export const email = (cle) => `recette+${cle.toLowerCase()}@${DOMAINE}`;

/** Catalogue fictif. `chapitres` = nombre de leçons par chapitre. */
export const COURS = {
  N1: { id: NIVEAUX["niveau-1"], slug: "niveau-1-bases-vetements-quotidiens", titre_fr: "Niveau 1 — Bases (recette)", chapitres: [3, 3, 3] },
  N2: { id: NIVEAUX["niveau-2"], slug: "niveau-2-classique-soiree", titre_fr: "Niveau 2 — Classique (recette)", chapitres: [3, 3] },
  N3: { id: NIVEAUX["niveau-3"], slug: "niveau-3-soiree-moulage", titre_fr: "Niveau 3 — Soirée (recette)", chapitres: [2, 2] },
  M1: { slug: "module-recette-6630", titre_fr: "Module 1 (recette)", titre_ar: "المحور 1 — recette", chapitres: [3] },
  M2: { slug: "module-recette-3185", titre_fr: "Module 2 (recette)", titre_ar: "المحور 2 — recette", chapitres: [3] },
  AU: { slug: "patron-numerique-recette", titre_fr: "Patron numérique (recette)", chapitres: [2, 2] },
  ...Object.fromEntries(Array.from({ length: 20 }, (_, k) => [`V${k + 1}`, { slug: `volume-recette-${k + 1}`, titre_fr: `Cours volume ${k + 1} (recette)`, chapitres: [1] }])),
};

export const QUIZ = [
  { cle: "Q1", cours: "N1", ch: 0, le: 0, max: 3 },
  { cle: "Q2", cours: "AU", ch: 0, le: 0, max: 3 },
];

/** Construit les élèves fictives et leurs attendus, à partir de l'instant du seed. */
export function scenarios(maintenant) {
  const J = (n) => new Date(maintenant.getTime() - n * 86_400_000).toISOString();
  const jourDebut = jourAlger(J(30));
  const debutMs = new Date(minuitAlgerIso(jourDebut)).getTime();
  const avant = "2026-05-01T10:00:00Z";
  const s = (cle, o) => ({ cle, connectee: true, inscriptions: [], progres: [], videos: [], quiz: [], travaux: [], questions: [], certificats: [], abonnements: [], reactivations: [], role: "eleve", ...o });

  const eleves = [
    s("S01", { connectee: false, inscriptions: [{ cours: "N1", le: J(3) }], attendu: { statut: "jamais_connectee", action: "accueillir", niveaux: ["N1"] } }),
    s("S02", { connectee: false, inscriptions: [{ cours: "N1", le: J(20) }], attendu: { statut: "jamais_connectee", action: "contacter" } }),
    s("S03", { inscriptions: [{ cours: "N2", le: J(10) }], videos: [{ cours: "N2", ch: 0, le: 0, pct: 30, at: J(1) }], attendu: { statut: "sans_activite", action: "relancer" } }),
    s("S04", { inscriptions: [{ cours: "N1", le: J(12) }], progres: [{ cours: "N1", ch: 0, le: 0, at: J(5) }, { cours: "N1", ch: 0, le: 1, at: J(2) }], attendu: { statut: "active", action: "aucune", reference_pct: 22 } }),
    s("S05", { inscriptions: [{ cours: "N1", le: J(20) }], progres: [{ cours: "N1", ch: 0, le: 0, at: J(10) }], attendu: { statut: "ralentie", action: "aucune" } }),
    s("S06", { inscriptions: [{ cours: "N2", le: J(25) }], progres: [{ cours: "N2", ch: 0, le: 0, at: J(20) }], attendu: { statut: "inactive", action: "relancer" } }),
    s("S07", { inscriptions: [{ cours: "N1", le: J(15) }], progres: [0, 1, 2].map((le, i) => ({ cours: "N1", ch: 0, le, at: J(4 - i) })), attendu: { statut: "active", action: "feliciter", etape: true, modules: 1 } }),
    s("S08", {
      inscriptions: [{ cours: "N3", le: J(25) }],
      progres: [[0, 0], [0, 1], [1, 0], [1, 1]].map(([ch, le], i) => ({ cours: "N3", ch, le, at: J(8 - i) })),
      certificats: [{ cours: "N3", at: J(5) }],
      attendu: { statut: "active", action: "feliciter", etape: true, modules: 2, reference_pct: 100 },
    }),
    s("S09", { inscriptions: [{ cours: "N1", le: J(10) }], quiz: [3, 2, 1].map((n) => ({ quiz: "Q1", score: 40, passed: false, at: J(n) })), attendu: { action: "verifier_blocage", blocage: "quiz_epuise" } }),
    s("S10", { inscriptions: [{ cours: "AU", le: J(6) }], travaux: [{ cours: "AU", ch: 0, le: 0, statut: "submitted", at: J(2) }, { cours: "AU", ch: 0, le: 0, statut: "submitted", at: J(2) }], attendu: { statut: "active", action: "aucune", tache: "a_corriger", a_corriger: 1 } }),
    s("S11", { inscriptions: [{ cours: "N1", le: J(25) }], travaux: [{ cours: "N1", ch: 0, le: 0, statut: "reviewed", at: J(15), revu: J(12) }], attendu: { statut: "inactive", action: "verifier_blocage", blocage: "travail_a_refaire", a_refaire: 1 } }),
    s("S12", { inscriptions: [{ cours: "N2", le: J(12) }], videos: [{ cours: "N2", ch: 0, le: 1, pct: 40, at: J(9) }], attendu: { statut: "sans_activite", action: "verifier_blocage", blocage: "video_en_plan" } }),
    s("S13", { inscriptions: [{ cours: "AU", le: J(8) }], progres: [{ cours: "AU", ch: 0, le: 0, at: J(1) }], abonnements: [{ cours: "AU", echeance: jourAlger(J(2)) }], attendu: { action: "verifier_blocage", blocage: "echeance" } }),
    s("S14", {
      inscriptions: [{ cours: "N1", le: J(5) }, { cours: "M1", le: avant, sansCommande: true }, { cours: "M2", le: avant, sansCommande: true }],
      progres: [
        ...[0, 1, 2].map((le) => ({ cours: "M1", ch: 0, le, at: `2026-05-1${le}T10:00:00Z` })),
        { cours: "M2", ch: 0, le: 0, at: "2026-05-13T10:00:00Z" },
        { cours: "N1", ch: 0, le: 0, at: J(1) },
      ],
      attendu: { statut: "active", action: "aucune", niveaux: ["N1"], reference_pct: 11, historique_lecons: 4, importee: true },
    }),
    s("S15", { connectee: false, inscriptions: [{ cours: "AU", le: new Date(debutMs + 30 * 60_000).toISOString() }], attendu: { statut: "jamais_connectee", action: "contacter" } }),
    s("S16", { connectee: false, inscriptions: [{ cours: "AU", le: new Date(debutMs - 30 * 60_000).toISOString() }], attendu: { suivie: false } }),
    s("S17", { inscriptions: [{ cours: "N2", le: J(28) }], progres: [{ cours: "N2", ch: 0, le: 0, at: J(20) }], reactivations: [{ stage: "direct_30", at: J(3) }], attendu: { statut: "inactive", action: "contacter" } }),
    s("S18", { inscriptions: [{ cours: "AU", le: J(4) }], progres: [{ cours: "AU", ch: 0, le: 0, at: J(2) }], questions: [{ cours: "AU", ch: 0, le: 0, at: J(2) }], attendu: { statut: "active", action: "aucune", tache: "question" } }),
    s("S19", { role: "formateur", inscriptions: [{ cours: "N1", le: J(3) }], attendu: { suivie: false } }),
    // Volume : 60 élèves × 20 cours = 1 200 inscriptions (pagination au-delà de 1 000).
    ...Array.from({ length: 60 }, (_, k) => s(`B${String(k + 1).padStart(2, "0")}`, {
      connectee: false,
      inscriptions: Array.from({ length: 20 }, (_, c) => ({ cours: `V${c + 1}`, le: J(7) })),
      attendu: { statut: "jamais_connectee", action: "accueillir" },
    })),
  ];
  return { jourDebut, eleves, suiviesAttendues: eleves.filter((e) => e.attendu.suivie !== false).length };
}
