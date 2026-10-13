/**
 * « Ma classe » — communications : ce qui est RÉELLEMENT branché, et ce qui reste à connecter.
 * Module PUR. Rien ici n'envoie quoi que ce soit : on PRÉPARE un texte, on ouvre un outil
 * existant (messagerie du site, centre d'annonces) ou l'application de l'enseignante
 * (WhatsApp, messagerie e-mail) — c'est elle qui relit et envoie.
 */

import type { CodeAction } from "../student-care/rules";
import { buildWaLink } from "../whatsapp";

export type EtatCommande = "branche" | "a_connecter";

export interface Commande {
  cle: "programmer_live" | "passer_live" | "email" | "message" | "annonce";
  libelle: string;
  etat: EtatCommande;
  /** Destination existante (si branchée). */
  href?: string;
  /** Ce que fait vraiment le bouton, ou pourquoi il n'est pas encore branché. */
  detail: string;
}

/** La barre de commande de l'enseignante (selon l'espace : /admin ou /formateur) : chaque bouton dit ce qu'il fait vraiment. */
export function commandesPour(base: string): readonly Commande[] {
  return [
  {
    cle: "programmer_live", libelle: "Programmer un live", etat: "branche", href: `${base}/lives/nouveau`,
    detail: "Ouvre la programmation des lives pédagogiques.",
  },
  {
    cle: "passer_live", libelle: "Passer en live", etat: "branche", href: "/formateur/sessions",
    detail: "Ouvre « Passer en direct » de l'espace formatrice (YouTube / Facebook, audience publique, groupe ou lien secret).",
  },
  {
    cle: "email", libelle: "Envoyer un email", etat: "a_connecter",
    detail: "À connecter : le site n'a pas d'envoi d'e-mail individuel depuis l'administration. Sur une fiche élève, vous pouvez PRÉPARER l'e-mail dans votre propre messagerie. Pour toute la classe : « Annonce de classe », option e-mail.",
  },
  {
    cle: "message", libelle: "Message individuel", etat: "branche",
    detail: "Ouvre la messagerie interne du site (bulle « Messagerie ») : vous choisissez l'élève, écrivez et envoyez vous-même.",
  },
  {
    cle: "annonce", libelle: "Annonce de classe", etat: "branche", href: "/formateur/annonces",
    detail: "Ouvre le Centre d'annonces existant (espace de l'élève + e-mail en option). L'envoi part quand VOUS validez là-bas.",
  },
];
}

/** Version administration (compatibilité). */
export const COMMANDES: readonly Commande[] = commandesPour("/admin");

/** Événement écouté par la bulle de messagerie du site pour s'ouvrir (sur une élève, si précisée). */
export const EVENEMENT_MESSAGERIE = "arazzo:messagerie";
export interface DetailMessagerie { id?: string; nom?: string; /** Brouillon pré-rempli (jamais envoyé automatiquement). */ texte?: string }

/** Premier prénom lisible (« Amina Benali (fictive) » → « Amina »). */
export function prenom(nom: string): string {
  return nom.replace(/\(.*?\)/g, " ").trim().split(/\s+/)[0] || "chère élève";
}

/** Brouillon proposé selon l'action recommandée par le suivi — toujours modifiable avant envoi. */
export function modeleMessage(nom: string, action: CodeAction, cours: string | null): { sujet: string; corps: string } {
  const p = prenom(nom);
  const c = cours ? ` « ${cours} »` : "";
  const fin = "\n\nBelle journée,\nL'équipe Arazzo";
  switch (action) {
    case "feliciter":
      return { sujet: "Bravo pour votre progression !", corps: `Bonjour ${p},\n\nBravo pour votre avancée dans votre formation${c} ! Continuez ainsi, vous êtes sur la bonne voie.${fin}` };
    case "accueillir":
      return { sujet: "Bienvenue chez Arazzo", corps: `Bonjour ${p},\n\nBienvenue dans votre formation${c} ! Avez-vous pu vous connecter et commencer la première leçon ? Je reste disponible si vous avez la moindre question.${fin}` };
    case "verifier_blocage":
      return { sujet: "Un point sur votre formation", corps: `Bonjour ${p},\n\nJ'ai vu que vous aviez peut-être rencontré une difficulté dans votre formation${c}. Puis-je vous aider ? Dites-moi où vous en êtes.${fin}` };
    case "contacter":
    case "relancer":
      return { sujet: "On reprend ensemble ?", corps: `Bonjour ${p},\n\nCela fait un moment que nous ne vous avons pas vue dans votre formation${c}. Tout va bien ? Je peux vous aider à reprendre là où vous vous êtes arrêtée.${fin}` };
    default:
      return { sujet: "Des nouvelles de votre formation", corps: `Bonjour ${p},\n\nJe voulais prendre de vos nouvelles concernant votre formation${c}. N'hésitez pas à me dire si vous avez besoin de quoi que ce soit.${fin}` };
  }
}

/** Lien qui ouvre la messagerie e-mail DE L'ENSEIGNANTE avec un brouillon (rien n'est envoyé par le site). */
export function lienMailto(email: string | null | undefined, sujet: string, corps: string): string | null {
  const e = (email ?? "").trim();
  if (!/^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/.test(e)) return null;
  return `mailto:${encodeURIComponent(e).replace(/%40/g, "@")}?subject=${encodeURIComponent(sujet)}&body=${encodeURIComponent(corps)}`;
}

/** Lien WhatsApp pré-rempli (l'enseignante relit et envoie depuis WhatsApp). */
export function lienWhatsApp(telephone: string | null | undefined, texte: string): string | null {
  return buildWaLink(telephone, texte);
}
