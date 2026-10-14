/**
 * Suivi pédagogique — ce que l'écran AFFICHE, sans jamais maquiller un manque.
 *
 * Une donnée absente n'est pas un zéro. Chaque cellule dit dans quel cas on est :
 *  - « valeur »           : la donnée existe ;
 *  - « aucune »           : la source couvre la période et ne contient rien ;
 *  - « indisponible »     : la source ne peut pas répondre (conservation limitée…) ;
 *  - « non_enregistree »  : le système ne sait pas capter cette activité ;
 *  - « non_applicable »   : la question ne se pose pas (cours sans quiz…).
 *
 * Module PUR.
 */

import type { SuiviEleve, Formation } from "./rules";
import { ilYA, joursDepuis } from "./time";

export type Etat = "valeur" | "aucune" | "indisponible" | "non_enregistree" | "non_applicable";

export interface Cellule {
  etat: Etat;
  texte: string;
  detail?: string;
}

/** Durées de conservation des journaux du LMS (src/lib/cleanup-logs.ts). */
export const CONSERVATION_JOURS = { notifications: 120, email_log: 120, activity_log: 180 } as const;

export const LEGENDE: Record<Etat, string> = {
  valeur: "Donnée enregistrée",
  aucune: "Aucune activité (la source couvre la période)",
  indisponible: "Donnée indisponible (source absente ou conservation dépassée)",
  non_enregistree: "Activité non enregistrée par le système",
  non_applicable: "Sans objet",
};

const GENRE: Record<string, string> = { lecon: "Leçon terminée", quiz: "Quiz", travail: "Travail soumis" };

export function celluleConnexion(s: SuiviEleve, maintenant: Date): Cellule {
  if (!s.derniere_auth && !s.derniere_connexion_journal) {
    return { etat: "aucune", texte: "Jamais connectée" };
  }
  const d = s.derniere_auth ?? s.derniere_connexion_journal;
  return {
    etat: "valeur",
    texte: `Authentifiée ${ilYA(joursDepuis(d, maintenant))}`,
    detail: "Dernière authentification : les sessions durent 400 jours, une élève qui revient sans se reconnecter garde une date ancienne.",
  };
}

export function celluleActivite(s: SuiviEleve, maintenant: Date): Cellule {
  if (s.derniere_activite) {
    return {
      etat: "valeur",
      texte: `${GENRE[s.derniere_activite.genre]} · ${ilYA(joursDepuis(s.derniere_activite.le, maintenant))}`,
    };
  }
  if (s.importee) {
    return {
      etat: "non_enregistree",
      texte: "Aucune depuis l'import",
      detail: "Élève importée de l'ancien système : son historique antérieur n'a pas été repris.",
    };
  }
  return { etat: "aucune", texte: "Aucune activité réelle" };
}

export function celluleProgression(f: Formation | null): Cellule {
  if (!f) return { etat: "indisponible", texte: "Aucune formation" };
  if (f.pourcentage === null) return { etat: "non_applicable", texte: "Cours sans leçon" };
  return {
    etat: "valeur",
    texte: `${f.pourcentage} % · ${f.lecons_faites}/${f.lecons_total} leçons`,
    detail: f.derniere_lecon_titre ? `Dernière leçon terminée : ${f.derniere_lecon_titre}` : undefined,
  };
}

export function celluleModules(f: Formation | null): Cellule {
  if (!f || f.modules_total === 0) return { etat: "non_applicable", texte: "—" };
  return { etat: "valeur", texte: `${f.modules_faits}/${f.modules_total} modules`, detail: `${f.modules_total - f.modules_faits} restant(s)` };
}

export function celluleQuiz(s: SuiviEleve): Cellule {
  if (!s.quiz.applicable) return { etat: "non_applicable", texte: "Pas de quiz dans ces cours" };
  if (s.quiz.tentatives === 0) return { etat: "aucune", texte: "Aucun quiz tenté" };
  return {
    etat: "valeur",
    texte: `${s.quiz.reussis} réussi(s) · ${s.quiz.tentatives} tentative(s)`,
    detail: s.quiz.dernier_score !== null ? `Dernier score : ${s.quiz.dernier_score} %` : undefined,
  };
}

export function celluleTravaux(s: SuiviEleve): Cellule {
  if (s.travaux.lecons === 0) return { etat: "aucune", texte: "Aucun travail soumis" };
  return {
    etat: "valeur",
    texte: `${s.travaux.valides} validé(s) · ${s.travaux.a_corriger} à corriger · ${s.travaux.a_refaire} à refaire`,
  };
}

export function celluleCertificats(s: SuiviEleve): Cellule {
  if (s.certificats.nombre === 0) return { etat: "aucune", texte: "Aucun" };
  return { etat: "valeur", texte: `${s.certificats.nombre} certificat(s)` };
}

export function celluleVideo(s: SuiviEleve, maintenant: Date): Cellule {
  if (!s.derniere_video) {
    return { etat: "aucune", texte: "Aucune ouverture", detail: "Le suivi vidéo ne concerne que les vidéos hébergées sur Bunny." };
  }
  return { etat: "valeur", texte: `Vidéo ouverte ${ilYA(joursDepuis(s.derniere_video, maintenant))}`, detail: "Signal : une vidéo ouverte ne prouve pas une progression." };
}

export function celluleLeconConsultee(s: SuiviEleve, maintenant: Date): Cellule {
  if (s.derniere_lecon_consultee) {
    return { etat: "valeur", texte: `Leçon ouverte ${ilYA(joursDepuis(s.derniere_lecon_consultee, maintenant))}` };
  }
  const anciennete = joursDepuis(s.suivie_depuis, maintenant) ?? 0;
  if (anciennete > CONSERVATION_JOURS.activity_log) {
    return { etat: "indisponible", texte: "Journal conservé 180 j", detail: "Les consultations plus anciennes ont été purgées." };
  }
  return { etat: "aucune", texte: "Aucune leçon ouverte" };
}

export function celluleRelances(s: SuiviEleve, maintenant: Date): Cellule {
  const r = s.relances;
  if (!r.reactivation_le && !r.rappel_lecon_le) return { etat: "aucune", texte: "Aucune relance enregistrée" };
  const parts: string[] = [];
  if (r.reactivation_le) parts.push(`Inactivité (${r.reactivation_palier ?? "?"}) ${ilYA(joursDepuis(r.reactivation_le, maintenant))}`);
  if (r.rappel_lecon_le) parts.push(`Rappel de leçon ${ilYA(joursDepuis(r.rappel_lecon_le, maintenant))}`);
  return { etat: "valeur", texte: parts.join(" · "), detail: "Relances automatiques EXISTANTES (notifications) ; rien n'est envoyé depuis ce tableau." };
}

export function celluleTelephone(s: SuiviEleve): Cellule {
  if (!s.telephone) {
    return { etat: "indisponible", texte: "Téléphone non disponible", detail: "Aucune commande, demande d'inscription ou dossier de diplôme avec un numéro." };
  }
  return { etat: "valeur", texte: s.telephone.valeur, detail: `Source : ${s.telephone.source}` };
}

/** Classes d'affichage par état (pastille discrète, lisible en clair). */
export const STYLE_ETAT: Record<Etat, string> = {
  valeur: "text-gray-800",
  aucune: "text-gray-500",
  indisponible: "text-amber-700 italic",
  non_enregistree: "text-sky-700 italic",
  non_applicable: "text-gray-400",
};
