import { test } from "node:test";
import assert from "node:assert/strict";
import { NIVEAUX } from "../niveaux";
import {
  calculerSuivi, calculerTous, lireSeuils, lireFiltres, filtrer, compter, trier, SEUILS_PAR_DEFAUT,
  type EntreeEleve, type LigneInscription, type SuiviEleve,
} from "./rules";
import { minuitAlgerIso } from "./time";
import { celluleActivite, celluleQuiz, celluleTelephone, celluleProgression, celluleConnexion } from "./display";

// Les tests vivent le 13 octobre 2026 à 12 h 00 heure d'Alger.
const MAINTENANT = new Date("2026-10-13T11:00:00Z");
const DEBUT = "2026-10-01";
const debutIso = minuitAlgerIso(DEBUT);
const S = { ...SEUILS_PAR_DEFAUT };
const ilYa = (jours: number, heureUtc = "11:00:00") => {
  const d = new Date(`2026-10-13T${heureUtc}Z`);
  d.setUTCDate(d.getUTCDate() - jours);
  return d.toISOString();
};

let compteur = 0;
function ligne(o: Partial<LigneInscription> = {}): LigneInscription {
  compteur += 1;
  return {
    enrollment_id: `e${compteur}`, user_id: "u1", course_id: `c${compteur}`, paid_at: ilYa(3), enrolled_at: null,
    order_id: "o1", expires_at: null, course_slug: `cours-${compteur}`, course_titre_fr: `Cours ${compteur}`, course_titre_ar: null,
    course_ordre: null, course_published: true, lessons_total: 10, chapters_total: 2, quizzes_total: 0,
    lessons_done: 0, last_lesson_done_at: null, last_lesson_done_id: null, last_lesson_done_titre: null,
    chapters_done: 0, last_chapter_done_at: null, videos_opened: 0, video_last_opened_at: null, videos_stalled: 0, last_stalled_at: null,
    quiz_attempts: 0, quizzes_passed: 0, quizzes_exhausted: 0, last_quiz_at: null, last_quiz_score: null,
    practical_lessons: 0, practicals_approved: 0, practicals_waiting_review: 0, practicals_to_redo: 0,
    last_practical_at: null, oldest_waiting_at: null, last_redo_request_at: null,
    questions_asked: 0, questions_unanswered: 0, oldest_unanswered_at: null, certificate_issued_at: null,
    last_real_activity_at: null, course_sub_status: null, course_sub_next_due: null, course_sub_paid: null,
    course_sub_total: null, pack_sub_next_due: null,
    ...o,
  };
}

function eleve(inscriptions: LigneInscription[], o: Partial<EntreeEleve> = {}): EntreeEleve {
  return {
    profil: { id: "u1", nom: "Élève Test", email: "eleve@exemple.test", username: null, ville: null, pays: "DZ", role: "eleve", created_at: ilYa(30) },
    auth: { last_sign_in_at: ilYa(1), statut: "actif" },
    signaux: null,
    inscriptions,
    telephone: null,
    ...o,
  };
}

const suivi = (e: EntreeEleve, seuils = S): SuiviEleve => {
  const r = calculerSuivi(e, { debutIso, maintenant: MAINTENANT, seuils });
  assert.ok(r, "l'élève devrait être suivie");
  return r;
};

// ── Périmètre ──

test("une élève inscrite AVANT la date de début n'est pas suivie", () => {
  assert.equal(calculerSuivi(eleve([ligne({ paid_at: "2026-09-20T10:00:00Z" })]), { debutIso, maintenant: MAINTENANT, seuils: S }), null);
});

test("la date de début se lit à minuit heure d'Alger", () => {
  // 30 sept. 23 h 30 UTC = 1er oct. 00 h 30 à Alger → suivie.
  assert.ok(calculerSuivi(eleve([ligne({ paid_at: "2026-09-30T23:30:00Z" })]), { debutIso, maintenant: MAINTENANT, seuils: S }));
  // 30 sept. 22 h 30 UTC = 30 sept. 23 h 30 à Alger → pas suivie.
  assert.equal(calculerSuivi(eleve([ligne({ paid_at: "2026-09-30T22:30:00Z" })]), { debutIso, maintenant: MAINTENANT, seuils: S }), null);
});

test("une ancienne inscription s'affiche aussi, marquée « antérieure au suivi »", () => {
  const s = suivi(eleve([ligne({ paid_at: "2026-03-01T10:00:00Z" }), ligne({ paid_at: ilYa(2) })]));
  assert.equal(s.formations.length, 2);
  assert.equal(s.formations.filter((f) => f.suivie).length, 1);
});

// ── Statuts ──

test("jamais connectée, inscrite il y a 3 j → accueillir", () => {
  const s = suivi(eleve([ligne({ paid_at: ilYa(3) })], { auth: { last_sign_in_at: null, statut: "actif" } }));
  assert.equal(s.statut, "jamais_connectee");
  assert.equal(s.action.code, "accueillir");
});

test("jamais connectée, inscrite il y a 10 j → relancer ; 12 j après le début… 20 j → contacter", () => {
  const e = (j: number) => eleve([ligne({ paid_at: ilYa(j) })], { auth: { last_sign_in_at: null, statut: "actif" } });
  const debutLarge = minuitAlgerIso("2026-09-01");
  assert.equal(calculerSuivi(e(10), { debutIso: debutLarge, maintenant: MAINTENANT, seuils: S })!.action.code, "relancer");
  assert.equal(calculerSuivi(e(20), { debutIso: debutLarge, maintenant: MAINTENANT, seuils: S })!.action.code, "contacter");
});

test("connectée sans activité réelle : une vidéo ouverte ne compte PAS comme progression", () => {
  const s = suivi(eleve([ligne({ paid_at: ilYa(10), videos_opened: 3, video_last_opened_at: ilYa(1) })]));
  assert.equal(s.statut, "sans_activite");
  assert.equal(s.derniere_activite, null);
  assert.equal(s.action.code, "relancer");
});

test("active / ralentie / inactive selon les seuils 7 et 14 jours", () => {
  const avec = (j: number) => suivi(eleve([ligne({ paid_at: ilYa(12), lessons_done: 1, last_lesson_done_at: ilYa(j) })]));
  assert.equal(avec(2).statut, "active");
  assert.equal(avec(6).statut, "active");
  assert.equal(avec(7).statut, "ralentie");
  assert.equal(avec(14).statut, "ralentie");
  const debutLarge = minuitAlgerIso("2026-08-01");
  const i = calculerSuivi(eleve([ligne({ paid_at: ilYa(60), lessons_done: 1, last_lesson_done_at: ilYa(20) })]), { debutIso: debutLarge, maintenant: MAINTENANT, seuils: S })!;
  assert.equal(i.statut, "inactive");
  assert.equal(i.action.code, "relancer");
  const c = calculerSuivi(eleve([ligne({ paid_at: ilYa(60), lessons_done: 1, last_lesson_done_at: ilYa(40) })]), { debutIso: debutLarge, maintenant: MAINTENANT, seuils: S })!;
  assert.equal(c.action.code, "contacter");
});

test("quiz tenté et travail soumis comptent comme activité réelle", () => {
  assert.equal(suivi(eleve([ligne({ quiz_attempts: 1, quizzes_total: 1, last_quiz_at: ilYa(1) })])).derniere_activite?.genre, "quiz");
  assert.equal(suivi(eleve([ligne({ practical_lessons: 1, last_practical_at: ilYa(1) })])).derniere_activite?.genre, "travail");
});

test("les seuils se comptent à l'heure d'Alger (6 j à Alger alors que 7 j en UTC)", () => {
  // Leçon le 6 oct. 23 h 30 UTC = 7 oct. 00 h 30 à Alger ; maintenant 13 oct. 22 h 00 UTC = 13 oct. 23 h 00 à Alger.
  const maintenant = new Date("2026-10-13T22:00:00Z");
  const r = calculerSuivi(
    eleve([ligne({ paid_at: "2026-10-02T10:00:00Z", lessons_done: 1, last_lesson_done_at: "2026-10-06T23:30:00Z" })]),
    { debutIso, maintenant, seuils: S },
  )!;
  assert.equal(r.jours_sans_activite, 6);
  assert.equal(r.statut, "active");
});

// ── Étapes et félicitations ──

test("module terminé depuis la date de suivi → étape terminée, féliciter", () => {
  const s = suivi(eleve([ligne({ lessons_done: 5, chapters_done: 1, last_lesson_done_at: ilYa(2), last_chapter_done_at: ilYa(2) })]));
  assert.equal(s.etape_terminee, true);
  assert.equal(s.action.code, "feliciter");
});

test("un certificat obtenu AVANT la date de suivi n'est pas une étape de la période", () => {
  const s = suivi(eleve([
    ligne({ paid_at: "2026-05-01T10:00:00Z", certificate_issued_at: "2026-06-01T10:00:00Z" }),
    ligne({ paid_at: ilYa(2), lessons_done: 1, last_lesson_done_at: ilYa(1) }),
  ]));
  assert.equal(s.etape_terminee, false);
  assert.equal(s.certificats.nombre, 1);
});

// ── Blocages ──

test("quiz échoué avec tentatives épuisées → vérifier un blocage", () => {
  const s = suivi(eleve([ligne({ quizzes_total: 2, quiz_attempts: 3, quizzes_exhausted: 1, last_quiz_at: ilYa(1) })]));
  assert.equal(s.action.code, "verifier_blocage");
  assert.ok(s.blocages.some((b) => b.code === "quiz_epuise"));
});

test("travail à refaire : blocage seulement au-delà de 10 jours", () => {
  const base = { practical_lessons: 1, practicals_to_redo: 1, last_practical_at: ilYa(20) };
  const debutLarge = minuitAlgerIso("2026-08-01");
  const vieux = calculerSuivi(eleve([ligne({ ...base, paid_at: ilYa(30), last_redo_request_at: ilYa(12) })]), { debutIso: debutLarge, maintenant: MAINTENANT, seuils: S })!;
  assert.ok(vieux.blocages.some((b) => b.code === "travail_a_refaire"));
  const recent = calculerSuivi(eleve([ligne({ ...base, paid_at: ilYa(30), last_redo_request_at: ilYa(5) })]), { debutIso: debutLarge, maintenant: MAINTENANT, seuils: S })!;
  assert.ok(!recent.blocages.some((b) => b.code === "travail_a_refaire"));
});

test("vidéo laissée en plan : blocage seulement s'il n'y a eu AUCUNE activité réelle depuis", () => {
  const sans = suivi(eleve([ligne({ paid_at: ilYa(12), videos_opened: 1, videos_stalled: 1, video_last_opened_at: ilYa(9), last_stalled_at: ilYa(9) })]));
  assert.ok(sans.blocages.some((b) => b.code === "video_en_plan"));
  const avec = suivi(eleve([ligne({ paid_at: ilYa(12), videos_stalled: 1, last_stalled_at: ilYa(9), lessons_done: 1, last_lesson_done_at: ilYa(2) })]));
  assert.ok(!avec.blocages.some((b) => b.code === "video_en_plan"));
});

test("échéance d'abonnement dépassée (jour d'Alger) → blocage", () => {
  const s = suivi(eleve([ligne({ course_sub_status: "active", course_sub_next_due: "2026-10-12", lessons_done: 1, last_lesson_done_at: ilYa(1) })]));
  assert.ok(s.blocages.some((b) => b.code === "echeance"));
  const ok = suivi(eleve([ligne({ course_sub_status: "active", course_sub_next_due: "2026-10-13", lessons_done: 1, last_lesson_done_at: ilYa(1) })]));
  assert.ok(!ok.blocages.some((b) => b.code === "echeance"));
});

test("travaux à corriger et questions sans réponse = tâches de l'ENSEIGNANTE, pas un blocage de l'élève", () => {
  const s = suivi(eleve([ligne({ practical_lessons: 2, practicals_waiting_review: 2, last_practical_at: ilYa(1), oldest_waiting_at: ilYa(4), questions_asked: 1, questions_unanswered: 1 })]));
  assert.equal(s.blocages.length, 0);
  assert.equal(s.taches_enseignante.length, 2);
});

test("relances existantes (palier 30 j) restées sans reprise → contacter", () => {
  const s = suivi(eleve([ligne({ paid_at: ilYa(12), lessons_done: 1, last_lesson_done_at: ilYa(10) })], {
    signaux: { user_id: "u1", last_login_logged_at: null, last_lesson_view_at: null, last_reactivation_at: ilYa(3), last_reactivation_stage: "direct_30", last_learning_reminder_at: null },
  }));
  assert.equal(s.action.code, "contacter");
});

// ── Anti-double comptage (cours de niveau / anciens modules) ──

test("cours de niveau + anciens modules : progression JAMAIS additionnée", () => {
  const s = suivi(eleve([
    ligne({ course_id: NIVEAUX["niveau-1"], course_titre_fr: "Niveau 1", lessons_total: 40, lessons_done: 4, last_lesson_done_at: ilYa(1) }),
    ligne({ course_titre_ar: "المحور 1", lessons_total: 5, lessons_done: 5, last_lesson_done_at: ilYa(3), paid_at: "2026-05-01T10:00:00Z", order_id: null }),
    ligne({ course_titre_ar: "المحور 2", lessons_total: 5, lessons_done: 2, last_lesson_done_at: ilYa(4), paid_at: "2026-05-01T10:00:00Z", order_id: null }),
  ]));
  assert.deepEqual(s.niveaux, ["N1"]);
  assert.equal(s.reference?.genre, "niveau");
  assert.equal(s.reference?.lecons_faites, 4);
  assert.equal(s.reference?.lecons_total, 40);
  assert.equal(s.reference?.pourcentage, 10);
  assert.deepEqual(s.historique, { cours: 2, lecons_faites: 7, derniere_le: ilYa(3) });
  assert.equal(s.importee, true);
});

test("anciens modules seuls → AUCUN niveau attribué", () => {
  const s = suivi(eleve([ligne({ course_titre_ar: "المحور 10", lessons_done: 2, last_lesson_done_at: ilYa(1) })]));
  assert.deepEqual(s.niveaux, []);
  assert.ok(s.historique);
});

test("pack N1 + N2 : deux niveaux, deux cours distincts", () => {
  const s = suivi(eleve([
    ligne({ course_id: NIVEAUX["niveau-1"] }),
    ligne({ course_id: NIVEAUX["niveau-2"] }),
  ]));
  assert.deepEqual(s.niveaux, ["N1", "N2"]);
});

// ── Seuils, filtres, compteurs ──

test("seuils : valeurs invalides → défaut ; incohérences corrigées prudemment", () => {
  assert.deepEqual(lireSeuils(null), SEUILS_PAR_DEFAUT);
  assert.deepEqual(lireSeuils({ active_jours: "abc", inactive_jours: 0, contact_jours: 9999 }), SEUILS_PAR_DEFAUT);
  const s = lireSeuils({ active_jours: 20, inactive_jours: 10, contact_jours: 5 });
  assert.equal(s.inactive_jours, 20);
  assert.equal(s.contact_jours, 20);
});

test("filtres, compteurs et tri", () => {
  const debutLarge = "2026-08-01";
  const liste = calculerTous([
    eleve([ligne({ course_id: NIVEAUX["niveau-1"], paid_at: ilYa(3) })], { profil: { id: "a", nom: "Amina", email: "a@x.test", username: null, ville: null, pays: null, role: "eleve", created_at: null }, auth: { last_sign_in_at: null, statut: "actif" } }),
    eleve([ligne({ course_id: NIVEAUX["niveau-2"], paid_at: ilYa(40), lessons_done: 2, last_lesson_done_at: ilYa(20) })], { profil: { id: "b", nom: "Basma", email: "b@x.test", username: "bb", ville: null, pays: null, role: "eleve", created_at: null } }),
    eleve([ligne({ paid_at: ilYa(5), practical_lessons: 1, practicals_waiting_review: 1, last_practical_at: ilYa(1) })], { profil: { id: "c", nom: "Chahra", email: "c@x.test", username: null, ville: null, pays: null, role: "eleve", created_at: null } }),
  ], { jourDebut: debutLarge, maintenant: MAINTENANT, seuils: S });
  assert.equal(liste.length, 3);
  const c = compter(liste);
  assert.equal(c.par_statut.jamais_connectee, 1);
  assert.equal(c.par_statut.inactive, 1);
  assert.equal(c.retard, 1);
  assert.equal(c.a_corriger, 1);
  assert.deepEqual(c.par_niveau, { N1: 1, N2: 1, N3: 0, aucun: 1 });
  assert.equal(filtrer(liste, lireFiltres({ niveau: "N2" })).length, 1);
  assert.equal(filtrer(liste, lireFiltres({ niveau: "aucun" }))[0].user_id, "c");
  assert.equal(filtrer(liste, lireFiltres({ vue: "retard" }))[0].user_id, "b");
  assert.equal(filtrer(liste, lireFiltres({ q: "BB" }))[0].user_id, "b");
  assert.equal(filtrer(liste, lireFiltres({ statut: "inconnu", niveau: "N9" })).length, 3);
  assert.equal(trier(liste, "inactivite")[0].user_id, "b");
  assert.equal(trier(liste, "nom")[0].user_id, "a");
});

// ── Affichage : un manque n'est jamais un zéro ──

test("affichage : non applicable, non enregistré, indisponible, aucune", () => {
  const s = suivi(eleve([ligne({ quizzes_total: 0, paid_at: ilYa(2) })]));
  assert.equal(celluleQuiz(s).etat, "non_applicable");
  assert.equal(celluleTelephone(s).etat, "indisponible");
  assert.equal(celluleActivite(s, MAINTENANT).etat, "aucune");
  const importee = suivi(eleve([ligne({ paid_at: "2026-05-01T10:00:00Z", order_id: null }), ligne({ paid_at: ilYa(2) })]));
  assert.equal(celluleActivite(importee, MAINTENANT).etat, "non_enregistree");
  const sansLecon = suivi(eleve([ligne({ lessons_total: 0 })]));
  assert.equal(celluleProgression(sansLecon.reference).etat, "non_applicable");
  const jamais = suivi(eleve([ligne()], { auth: { last_sign_in_at: null, statut: "actif" } }));
  assert.equal(celluleConnexion(jamais, MAINTENANT).texte, "Jamais connectée");
});
