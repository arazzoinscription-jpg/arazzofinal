/**
 * Suivi pédagogique — les RÈGLES, lisibles et testables.
 *
 * Décisions de l'administratrice (2026-10-13) traduites ici, sans rien d'autre :
 *  - activité pédagogique RÉELLE = leçon terminée, quiz tenté, travail pratique
 *    soumis. Connexions, vidéos ouvertes, leçons consultées et questions sont
 *    des SIGNAUX affichés à part : ils ne prouvent pas une progression ;
 *  - une élève est suivie dès qu'elle a au moins une inscription datée
 *    (`paid_at`) à partir de la date choisie ;
 *  - niveaux N1/N2/N3 confirmés uniquement par les cours de `niveaux.ts` ;
 *    anciens modules affichés à part, jamais additionnés (voir `levels.ts`) ;
 *  - seuils configurables ; AUCUNE relance automatique : l'action recommandée
 *    est une SUGGESTION affichée à l'enseignante, rien n'est envoyé ;
 *  - tous les jours se comptent à l'heure d'Alger (voir `time.ts`).
 *
 * Module PUR : aucun accès réseau ni base, aucun envoi possible.
 */

import { classerCours, type CodeNiveau, type GenreCours } from "./levels";
import { aujourdhuiAlger, joursDepuis, minuitAlgerIso } from "./time";
import { TELEGRAM_IMPORT_CUTOFF } from "../../app/dashboard/telegram-proof-config";

// ─── Seuils ─────────────────────────────────────────────────────────────────

export interface Seuils {
  /** Activité réelle depuis MOINS de N jours → « active ». */
  active_jours: number;
  /** Plus de N jours sans activité réelle → « inactive ». Entre les deux : « ralentie ». */
  inactive_jours: number;
  /** Plus de N jours sans activité réelle → contact personnel recommandé. */
  contact_jours: number;
  /** Inscrite depuis N jours au plus, sans activité réelle → « accueillir ». */
  accueil_jours: number;
  /** Module ou certificat obtenu depuis N jours au plus → « féliciter ». */
  felicitations_jours: number;
  /** Travail « à refaire » depuis plus de N jours sans nouvel envoi → blocage. */
  refaire_jours: number;
  /** Vidéo commencée puis laissée en plan depuis plus de N jours → blocage. */
  video_jours: number;
}

/** Valeurs validées par l'administratrice le 2026-10-13. */
export const SEUILS_PAR_DEFAUT: Readonly<Seuils> = Object.freeze({
  active_jours: 7,
  inactive_jours: 14,
  contact_jours: 30,
  accueil_jours: 7,
  felicitations_jours: 7,
  refaire_jours: 10,
  video_jours: 7,
});

export const CLES_SEUILS = Object.keys(SEUILS_PAR_DEFAUT) as (keyof Seuils)[];

/**
 * Seuils à partir de ce qui est stocké (JSON libre) : toute valeur absente,
 * non entière ou hors de 1–365 retombe sur le défaut. Les incohérences
 * (inactive ≤ active, contact < inactive) sont corrigées dans le sens prudent.
 */
export function lireSeuils(brut: unknown): Seuils {
  const src = (brut && typeof brut === "object" ? brut : {}) as Record<string, unknown>;
  const s = { ...SEUILS_PAR_DEFAUT } as Seuils;
  for (const k of CLES_SEUILS) {
    const v = Number(src[k]);
    if (Number.isInteger(v) && v >= 1 && v <= 365) s[k] = v;
  }
  if (s.inactive_jours < s.active_jours) s.inactive_jours = s.active_jours;
  if (s.contact_jours < s.inactive_jours) s.contact_jours = s.inactive_jours;
  return s;
}

// ─── Données d'entrée (colonnes des vues de la migration 095) ────────────────

/** Une ligne de `student_care_enrollments` (élève × cours). */
export interface LigneInscription {
  enrollment_id: string;
  user_id: string;
  course_id: string;
  paid_at: string;
  enrolled_at: string | null;
  order_id: string | null;
  expires_at: string | null;
  course_slug: string | null;
  course_titre_fr: string | null;
  course_titre_ar: string | null;
  course_ordre: number | null;
  course_published: boolean | null;
  lessons_total: number;
  chapters_total: number;
  quizzes_total: number;
  lessons_done: number;
  last_lesson_done_at: string | null;
  last_lesson_done_id: string | null;
  last_lesson_done_titre: string | null;
  chapters_done: number;
  last_chapter_done_at: string | null;
  videos_opened: number;
  video_last_opened_at: string | null;
  videos_stalled: number;
  last_stalled_at: string | null;
  quiz_attempts: number;
  quizzes_passed: number;
  quizzes_exhausted: number;
  last_quiz_at: string | null;
  last_quiz_score: number | null;
  practical_lessons: number;
  practicals_approved: number;
  practicals_waiting_review: number;
  practicals_to_redo: number;
  last_practical_at: string | null;
  oldest_waiting_at: string | null;
  last_redo_request_at: string | null;
  questions_asked: number;
  questions_unanswered: number;
  oldest_unanswered_at: string | null;
  certificate_issued_at: string | null;
  last_real_activity_at: string | null;
  course_sub_status: string | null;
  course_sub_next_due: string | null;
  course_sub_paid: number | null;
  course_sub_total: number | null;
  pack_sub_next_due: string | null;
}

/** Une ligne de `student_care_signals` (signaux de l'élève, jamais comptés comme activité réelle). */
export interface LigneSignaux {
  user_id: string;
  last_login_logged_at: string | null;
  last_lesson_view_at: string | null;
  last_reactivation_at: string | null;
  last_reactivation_stage: string | null;
  last_learning_reminder_at: string | null;
}

export interface Profil {
  id: string;
  nom: string | null;
  email: string | null;
  username: string | null;
  ville: string | null;
  pays: string | null;
  role: string | null;
  created_at: string | null;
}

export interface InfoAuth {
  /** Dernière AUTHENTIFICATION (Supabase Auth). Les sessions durent 400 jours : peut être ancienne. */
  last_sign_in_at: string | null;
  statut: "actif" | "veille" | "bloque";
}

export interface Telephone {
  valeur: string;
  /** D'où vient ce numéro (« commande du 3 oct. 2026 »…) : le LMS n'a pas de téléphone sur le profil. */
  source: string;
}

export interface EntreeEleve {
  profil: Profil;
  auth: InfoAuth | null;
  signaux: LigneSignaux | null;
  /** TOUTES les inscriptions de l'élève (y compris antérieures à la date de suivi). */
  inscriptions: LigneInscription[];
  telephone: Telephone | null;
}

// ─── Résultat ───────────────────────────────────────────────────────────────

export type Statut = "jamais_connectee" | "sans_activite" | "active" | "ralentie" | "inactive";
export type CodeAction = "verifier_blocage" | "contacter" | "relancer" | "accueillir" | "feliciter" | "aucune";
export type GenreActivite = "lecon" | "quiz" | "travail";

export const LIBELLE_STATUT: Record<Statut, string> = {
  jamais_connectee: "Jamais connectée",
  sans_activite: "Connectée, sans activité réelle",
  active: "Active",
  ralentie: "Ralentie",
  inactive: "Inactive",
};

export const LIBELLE_ACTION: Record<CodeAction, string> = {
  verifier_blocage: "Vérifier un blocage",
  contacter: "Contacter personnellement",
  relancer: "Relancer",
  accueillir: "Accueillir",
  feliciter: "Féliciter",
  aucune: "Rien à signaler",
};

export interface Formation {
  enrollment_id: string;
  course_id: string;
  titre: string;
  genre: GenreCours;
  niveau: CodeNiveau | null;
  /** Inscription datée à partir de la date de suivi. */
  suivie: boolean;
  inscrite_le: string;
  lecons_faites: number;
  lecons_total: number;
  /** null quand le cours n'a aucune leçon (jamais « 0 % » inventé). */
  pourcentage: number | null;
  modules_faits: number;
  modules_total: number;
  derniere_lecon_titre: string | null;
  derniere_lecon_le: string | null;
  quiz_total: number;
  certificat_le: string | null;
}

export interface Signal { code: string; libelle: string }

export interface SuiviEleve {
  user_id: string;
  nom: string;
  email: string | null;
  pseudo: string | null;
  telephone: Telephone | null;
  /** Première inscription datée à partir de la date de suivi. */
  suivie_depuis: string;
  premiere_inscription: string;
  niveaux: CodeNiveau[];
  formations: Formation[];
  /** Cours de référence : le cours de niveau (ou, à défaut, la formation suivie la plus récente). */
  reference: Formation | null;
  /** Anciens modules : progression montrée À PART, jamais additionnée au niveau. */
  historique: { cours: number; lecons_faites: number; derniere_le: string | null } | null;
  /** Inscription importée de l'ancien système : historique antérieur non enregistré. */
  importee: boolean;
  derniere_auth: string | null;
  derniere_connexion_journal: string | null;
  derniere_activite: { le: string; genre: GenreActivite } | null;
  derniere_video: string | null;
  derniere_lecon_consultee: string | null;
  jours_sans_activite: number | null;
  quiz: { applicable: boolean; tentatives: number; reussis: number; epuises: number; dernier_score: number | null };
  travaux: { lecons: number; valides: number; a_corriger: number; a_refaire: number; plus_ancien_a_corriger: string | null };
  questions: { posees: number; sans_reponse: number };
  certificats: { nombre: number; dernier_le: string | null };
  relances: { reactivation_le: string | null; reactivation_palier: string | null; rappel_lecon_le: string | null };
  statut: Statut;
  blocages: Signal[];
  taches_enseignante: Signal[];
  /** Module ou certificat obtenu depuis la date de suivi. */
  etape_terminee: boolean;
  derniere_etape_le: string | null;
  action: { code: CodeAction; libelle: string; raison: string };
}

// ─── Petits outils ──────────────────────────────────────────────────────────

const n = (v: unknown): number => {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
};

/** Le plus récent de plusieurs instants ISO (les absents sont ignorés). */
export function plusRecent(...dates: (string | null | undefined)[]): string | null {
  let best: string | null = null;
  let bestMs = -Infinity;
  for (const d of dates) {
    if (!d) continue;
    const ms = new Date(d).getTime();
    if (Number.isFinite(ms) && ms > bestMs) { bestMs = ms; best = d; }
  }
  return best;
}

const plusAncien = (...dates: (string | null | undefined)[]): string | null => {
  let best: string | null = null;
  let bestMs = Infinity;
  for (const d of dates) {
    if (!d) continue;
    const ms = new Date(d).getTime();
    if (Number.isFinite(ms) && ms < bestMs) { bestMs = ms; best = d; }
  }
  return best;
};

const apres = (a: string | null, b: string | null): boolean =>
  Boolean(a && b && new Date(a).getTime() > new Date(b).getTime());

const pluriel = (k: number, un: string, plusieurs: string) => `${k} ${k > 1 ? plusieurs : un}`;

// ─── Calcul d'une élève ─────────────────────────────────────────────────────

/**
 * Calcule le suivi d'une élève. `debutIso` = minuit à Alger du jour de début.
 * Renvoie `null` si l'élève n'a aucune inscription datée à partir de ce jour.
 */
export function calculerSuivi(
  entree: EntreeEleve,
  { debutIso, maintenant, seuils }: { debutIso: string; maintenant: Date; seuils: Seuils },
): SuiviEleve | null {
  const debutMs = new Date(debutIso).getTime();
  const lignes = entree.inscriptions;
  const suivies = lignes.filter((l) => new Date(l.paid_at).getTime() >= debutMs);
  if (suivies.length === 0) return null;

  const formations: Formation[] = lignes
    .map((l) => {
      const { genre, niveau } = classerCours(l);
      const total = n(l.lessons_total);
      return {
        enrollment_id: l.enrollment_id,
        course_id: l.course_id,
        titre: l.course_titre_fr || l.course_titre_ar || "Formation",
        genre,
        niveau,
        suivie: new Date(l.paid_at).getTime() >= debutMs,
        inscrite_le: l.paid_at,
        lecons_faites: n(l.lessons_done),
        lecons_total: total,
        pourcentage: total > 0 ? Math.round((n(l.lessons_done) / total) * 100) : null,
        modules_faits: n(l.chapters_done),
        modules_total: n(l.chapters_total),
        derniere_lecon_titre: l.last_lesson_done_titre,
        derniere_lecon_le: l.last_lesson_done_at,
        quiz_total: n(l.quizzes_total),
        certificat_le: l.certificate_issued_at,
      };
    })
    .sort((a, b) => new Date(b.inscrite_le).getTime() - new Date(a.inscrite_le).getTime());

  const niveaux = [...new Set(formations.filter((f) => f.niveau).map((f) => f.niveau as CodeNiveau))].sort();

  // Référence : le cours de niveau suivi le plus récent, sinon la formation suivie la plus récente
  // hors anciens modules, sinon la plus récente tout court. Jamais une somme.
  const reference =
    formations.find((f) => f.genre === "niveau" && f.suivie)
    ?? formations.find((f) => f.genre === "niveau")
    ?? formations.find((f) => f.genre !== "ancien_module" && f.suivie)
    ?? formations.find((f) => f.genre !== "ancien_module")
    ?? formations[0]
    ?? null;

  const modules = formations.filter((f) => f.genre === "ancien_module");
  const historique = modules.length
    ? {
      cours: modules.length,
      lecons_faites: modules.reduce((s, f) => s + f.lecons_faites, 0),
      derniere_le: plusRecent(...modules.map((f) => f.derniere_lecon_le)),
    }
    : null;

  const importee = lignes.some(
    (l) => !l.order_id && new Date(l.paid_at).getTime() < new Date(TELEGRAM_IMPORT_CUTOFF).getTime(),
  );

  // Activité réelle : maximum sur TOUTES les inscriptions (un maximum ne double jamais rien).
  const derniereLecon = plusRecent(...lignes.map((l) => l.last_lesson_done_at));
  const dernierQuiz = plusRecent(...lignes.map((l) => l.last_quiz_at));
  const dernierTravail = plusRecent(...lignes.map((l) => l.last_practical_at));
  const derniereReelle = plusRecent(derniereLecon, dernierQuiz, dernierTravail);
  const derniere_activite = derniereReelle
    ? {
      le: derniereReelle,
      genre: (derniereReelle === derniereLecon ? "lecon" : derniereReelle === dernierQuiz ? "quiz" : "travail") as GenreActivite,
    }
    : null;

  const derniere_auth = entree.auth?.last_sign_in_at ?? null;
  const derniere_connexion_journal = entree.signaux?.last_login_logged_at ?? null;
  const connectee = Boolean(derniere_auth || derniere_connexion_journal || derniereReelle);

  const suivie_depuis = plusAncien(...suivies.map((l) => l.paid_at)) as string;
  const premiere_inscription = plusAncien(...lignes.map((l) => l.paid_at)) as string;

  // Jours sans activité : depuis la dernière activité réelle, ou depuis l'inscription suivie si aucune.
  const joursActivite = joursDepuis(derniereReelle, maintenant);
  const joursInscription = joursDepuis(suivie_depuis, maintenant) ?? 0;
  const jours_sans_activite = derniereReelle ? joursActivite : joursInscription;

  // Statut (exclusif).
  let statut: Statut;
  if (!connectee) statut = "jamais_connectee";
  else if (!derniereReelle) statut = "sans_activite";
  else if ((joursActivite ?? 0) < seuils.active_jours) statut = "active";
  else if ((joursActivite ?? 0) > seuils.inactive_jours) statut = "inactive";
  else statut = "ralentie";

  // Quiz.
  const quizTotal = lignes.reduce((s, l) => s + n(l.quizzes_total), 0);
  const quiz = {
    applicable: quizTotal > 0,
    tentatives: lignes.reduce((s, l) => s + n(l.quiz_attempts), 0),
    reussis: lignes.reduce((s, l) => s + n(l.quizzes_passed), 0),
    epuises: lignes.reduce((s, l) => s + n(l.quizzes_exhausted), 0),
    dernier_score: (() => {
      const l = lignes.filter((x) => x.last_quiz_at).sort((a, b) => new Date(b.last_quiz_at!).getTime() - new Date(a.last_quiz_at!).getTime())[0];
      return l ? l.last_quiz_score : null;
    })(),
  };

  // Travaux pratiques (états PAR LEÇON, calculés dans la vue).
  const travaux = {
    lecons: lignes.reduce((s, l) => s + n(l.practical_lessons), 0),
    valides: lignes.reduce((s, l) => s + n(l.practicals_approved), 0),
    a_corriger: lignes.reduce((s, l) => s + n(l.practicals_waiting_review), 0),
    a_refaire: lignes.reduce((s, l) => s + n(l.practicals_to_redo), 0),
    plus_ancien_a_corriger: plusAncien(...lignes.map((l) => l.oldest_waiting_at)),
  };

  const questions = {
    posees: lignes.reduce((s, l) => s + n(l.questions_asked), 0),
    sans_reponse: lignes.reduce((s, l) => s + n(l.questions_unanswered), 0),
  };

  const certifs = lignes.map((l) => l.certificate_issued_at).filter(Boolean) as string[];
  const certificats = { nombre: certifs.length, dernier_le: plusRecent(...certifs) };

  // ── Blocages côté ÉLÈVE ──
  const blocages: Signal[] = [];
  if (quiz.epuises > 0) {
    blocages.push({ code: "quiz_epuise", libelle: `${pluriel(quiz.epuises, "quiz échoué", "quiz échoués")}, tentatives épuisées` });
  }
  const derniereDemandeRefaire = plusRecent(...lignes.filter((l) => n(l.practicals_to_redo) > 0).map((l) => l.last_redo_request_at));
  const joursRefaire = joursDepuis(derniereDemandeRefaire, maintenant);
  if (travaux.a_refaire > 0 && joursRefaire !== null && joursRefaire > seuils.refaire_jours) {
    blocages.push({ code: "travail_a_refaire", libelle: `Travail à refaire depuis ${joursRefaire} j` });
  }
  const derniereVideoEnPlan = plusRecent(...lignes.filter((l) => n(l.videos_stalled) > 0).map((l) => l.last_stalled_at));
  const joursVideo = joursDepuis(derniereVideoEnPlan, maintenant);
  if (derniereVideoEnPlan && joursVideo !== null && joursVideo > seuils.video_jours
    && (!derniereReelle || apres(derniereVideoEnPlan, derniereReelle))) {
    blocages.push({ code: "video_en_plan", libelle: `Vidéo commencée puis laissée en plan depuis ${joursVideo} j` });
  }
  const aujourdhui = aujourdhuiAlger(maintenant);
  const echeanceDepassee = lignes.some((l) =>
    (l.course_sub_status === "active" && l.course_sub_next_due && l.course_sub_next_due < aujourdhui)
    || (l.pack_sub_next_due && l.pack_sub_next_due < aujourdhui));
  if (echeanceDepassee) blocages.push({ code: "echeance", libelle: "Échéance d'abonnement dépassée (contenu verrouillé)" });
  if (entree.auth?.statut === "veille") blocages.push({ code: "compte_veille", libelle: "Compte en veille" });
  if (entree.auth?.statut === "bloque") blocages.push({ code: "compte_bloque", libelle: "Compte bloqué" });

  // ── Tâches côté ENSEIGNANTE (ce n'est pas l'élève qui est bloquée) ──
  const taches_enseignante: Signal[] = [];
  if (travaux.a_corriger > 0) {
    const j = joursDepuis(travaux.plus_ancien_a_corriger, maintenant);
    taches_enseignante.push({ code: "a_corriger", libelle: `${pluriel(travaux.a_corriger, "travail", "travaux")} à corriger${j !== null ? ` (le plus ancien : ${j} j)` : ""}` });
  }
  if (questions.sans_reponse > 0) {
    taches_enseignante.push({ code: "question", libelle: pluriel(questions.sans_reponse, "question sans réponse", "questions sans réponse") });
  }

  // ── Étapes terminées depuis la date de suivi ──
  const etapes = lignes.flatMap((l) => [l.last_chapter_done_at, l.certificate_issued_at])
    .filter((d): d is string => Boolean(d) && new Date(d as string).getTime() >= debutMs);
  const derniere_etape_le = plusRecent(...etapes);
  const etape_terminee = etapes.length > 0;
  const joursEtape = joursDepuis(derniere_etape_le, maintenant);

  // ── Relances déjà envoyées par l'existant (rien n'est envoyé ici) ──
  const relances = {
    reactivation_le: entree.signaux?.last_reactivation_at ?? null,
    reactivation_palier: entree.signaux?.last_reactivation_stage ?? null,
    rappel_lecon_le: entree.signaux?.last_learning_reminder_at ?? null,
  };
  const relancesSansEffet = Boolean(
    relances.reactivation_le
    && ["direct_30", "notify_teacher_60"].includes(relances.reactivation_palier ?? "")
    && (!derniereReelle || apres(relances.reactivation_le, derniereReelle)),
  );

  // ── Action recommandée (une seule, par priorité) ──
  let action: SuiviEleve["action"];
  const idle = jours_sans_activite ?? 0;
  if (blocages.length) {
    action = { code: "verifier_blocage", libelle: LIBELLE_ACTION.verifier_blocage, raison: blocages.map((b) => b.libelle).join(" · ") };
  } else if (derniereReelle && idle > seuils.contact_jours) {
    action = { code: "contacter", libelle: LIBELLE_ACTION.contacter, raison: `Aucune activité réelle depuis ${idle} j` };
  } else if (!derniereReelle && !connectee && idle > seuils.inactive_jours) {
    action = { code: "contacter", libelle: LIBELLE_ACTION.contacter, raison: `Jamais connectée, inscrite depuis ${idle} j` };
  } else if (!derniereReelle && idle > seuils.contact_jours) {
    action = { code: "contacter", libelle: LIBELLE_ACTION.contacter, raison: `Aucune activité réelle depuis l'inscription (${idle} j)` };
  } else if (relancesSansEffet) {
    action = { code: "contacter", libelle: LIBELLE_ACTION.contacter, raison: `Relances déjà envoyées (palier ${relances.reactivation_palier}) sans reprise` };
  } else if (derniereReelle && idle > seuils.inactive_jours) {
    action = { code: "relancer", libelle: LIBELLE_ACTION.relancer, raison: `Aucune activité réelle depuis ${idle} j` };
  } else if (!derniereReelle && idle > seuils.accueil_jours) {
    action = { code: "relancer", libelle: LIBELLE_ACTION.relancer, raison: `Pas encore commencé, inscrite depuis ${idle} j` };
  } else if (!derniereReelle) {
    action = { code: "accueillir", libelle: LIBELLE_ACTION.accueillir, raison: idle === 0 ? "Inscrite aujourd'hui" : `Inscrite depuis ${idle} j` };
  } else if (joursEtape !== null && joursEtape <= seuils.felicitations_jours) {
    action = { code: "feliciter", libelle: LIBELLE_ACTION.feliciter, raison: joursEtape === 0 ? "Étape terminée aujourd'hui" : `Étape terminée il y a ${joursEtape} j` };
  } else {
    action = { code: "aucune", libelle: LIBELLE_ACTION.aucune, raison: "" };
  }

  return {
    user_id: entree.profil.id,
    nom: entree.profil.nom?.trim() || "—",
    email: entree.profil.email,
    pseudo: entree.profil.username,
    telephone: entree.telephone,
    suivie_depuis,
    premiere_inscription,
    niveaux,
    formations,
    reference,
    historique,
    importee,
    derniere_auth,
    derniere_connexion_journal,
    derniere_activite,
    derniere_video: plusRecent(...lignes.map((l) => l.video_last_opened_at)),
    derniere_lecon_consultee: entree.signaux?.last_lesson_view_at ?? null,
    jours_sans_activite,
    quiz,
    travaux,
    questions,
    certificats,
    relances,
    statut,
    blocages,
    taches_enseignante,
    etape_terminee,
    derniere_etape_le,
    action,
  };
}

/** Calcule le suivi de plusieurs élèves (celles sans inscription suivie sont écartées). */
export function calculerTous(
  entrees: EntreeEleve[],
  { jourDebut, maintenant, seuils }: { jourDebut: string; maintenant: Date; seuils: Seuils },
): SuiviEleve[] {
  const debutIso = minuitAlgerIso(jourDebut);
  return entrees
    .map((e) => calculerSuivi(e, { debutIso, maintenant, seuils }))
    .filter((x): x is SuiviEleve => x !== null);
}

// ─── Filtres, compteurs, tri ────────────────────────────────────────────────

export type Vue = "retard" | "etape" | "a_corriger" | "a_refaire";

export interface Filtres {
  niveau: CodeNiveau | "aucun" | null;
  statut: Statut | null;
  vue: Vue | null;
  action: CodeAction | null;
  q: string;
  tri: "inscription" | "inactivite" | "nom";
}

const STATUTS = Object.keys(LIBELLE_STATUT) as Statut[];
const ACTIONS = Object.keys(LIBELLE_ACTION) as CodeAction[];

/** Filtres depuis les paramètres d'adresse ; toute valeur inconnue est ignorée. */
export function lireFiltres(p: Record<string, string | string[] | undefined>): Filtres {
  const v = (k: string) => {
    const x = p[k];
    return (Array.isArray(x) ? x[0] : x)?.trim() ?? "";
  };
  const niveau = v("niveau");
  const statut = v("statut");
  const vue = v("vue");
  const action = v("action");
  const tri = v("tri");
  return {
    niveau: (["N1", "N2", "N3", "aucun"] as const).find((x) => x === niveau) ?? null,
    statut: STATUTS.find((x) => x === statut) ?? null,
    vue: (["retard", "etape", "a_corriger", "a_refaire"] as const).find((x) => x === vue) ?? null,
    action: ACTIONS.find((x) => x === action) ?? null,
    q: v("q").slice(0, 100),
    tri: tri === "inactivite" || tri === "nom" ? tri : "inscription",
  };
}

export const estEnRetardOuBloquee = (s: SuiviEleve) => s.statut === "inactive" || s.blocages.length > 0;

export function filtrer(liste: SuiviEleve[], f: Filtres): SuiviEleve[] {
  const q = f.q.toLowerCase();
  return liste.filter((s) => {
    if (f.niveau === "aucun" && s.niveaux.length) return false;
    if (f.niveau && f.niveau !== "aucun" && !s.niveaux.includes(f.niveau)) return false;
    if (f.statut && s.statut !== f.statut) return false;
    if (f.vue === "retard" && !estEnRetardOuBloquee(s)) return false;
    if (f.vue === "etape" && !s.etape_terminee) return false;
    if (f.vue === "a_corriger" && s.travaux.a_corriger === 0) return false;
    if (f.vue === "a_refaire" && s.travaux.a_refaire === 0) return false;
    if (f.action && s.action.code !== f.action) return false;
    if (q && ![s.nom, s.email ?? "", s.pseudo ?? ""].some((t) => t.toLowerCase().includes(q))) return false;
    return true;
  });
}

export function trier(liste: SuiviEleve[], tri: Filtres["tri"]): SuiviEleve[] {
  const copie = [...liste];
  if (tri === "nom") return copie.sort((a, b) => a.nom.localeCompare(b.nom, "fr"));
  if (tri === "inactivite") return copie.sort((a, b) => (b.jours_sans_activite ?? -1) - (a.jours_sans_activite ?? -1));
  return copie.sort((a, b) => new Date(b.suivie_depuis).getTime() - new Date(a.suivie_depuis).getTime());
}

export interface Compteurs {
  total: number;
  par_statut: Record<Statut, number>;
  retard: number;
  etape: number;
  a_corriger: number;
  a_refaire: number;
  par_action: Record<CodeAction, number>;
  par_niveau: Record<CodeNiveau | "aucun", number>;
}

export function compter(liste: SuiviEleve[]): Compteurs {
  const c: Compteurs = {
    total: liste.length,
    par_statut: Object.fromEntries(STATUTS.map((s) => [s, 0])) as Record<Statut, number>,
    retard: 0,
    etape: 0,
    a_corriger: 0,
    a_refaire: 0,
    par_action: Object.fromEntries(ACTIONS.map((a) => [a, 0])) as Record<CodeAction, number>,
    par_niveau: { N1: 0, N2: 0, N3: 0, aucun: 0 },
  };
  for (const s of liste) {
    c.par_statut[s.statut] += 1;
    c.par_action[s.action.code] += 1;
    if (estEnRetardOuBloquee(s)) c.retard += 1;
    if (s.etape_terminee) c.etape += 1;
    if (s.travaux.a_corriger > 0) c.a_corriger += 1;
    if (s.travaux.a_refaire > 0) c.a_refaire += 1;
    if (s.niveaux.length === 0) c.par_niveau.aucun += 1;
    for (const nv of s.niveaux) c.par_niveau[nv] += 1;
  }
  return c;
}
