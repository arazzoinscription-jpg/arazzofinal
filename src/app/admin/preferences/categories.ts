import type { EmailCategory } from "@/lib/email-templates";

/**
 * Catalogue des catégories d'emails de la plateforme, affiché sur la page
 * /admin/preferences. `key` = catégorie passée à sendEmail (email_log,
 * email_preferences élève, préférences admin).
 */
export interface EmailCategoryInfo {
  key: EmailCategory;
  label: string;
  description: string;
  examples: string;
}

export const EMAIL_CATEGORIES: EmailCategoryInfo[] = [
  {
    key: "welcome",
    label: "Bienvenue",
    description: "Email envoyé à la création d'un compte.",
    examples: "« Bienvenue chez Arazzo Formation »",
  },
  {
    key: "purchases",
    label: "Achats & factures",
    description: "Confirmations de commande, reçus, échéances d'abonnement.",
    examples: "« Votre commande est confirmée », « Votre reçu »",
  },
  {
    key: "new_content",
    label: "Nouveau contenu",
    description: "Nouvelles leçons ou formations publiées.",
    examples: "« Une nouvelle leçon est disponible »",
  },
  {
    key: "teacher_reply",
    label: "Réponses du formateur",
    description: "Le formateur a répondu à une question ou corrigé un travail.",
    examples: "« Votre formatrice vous a répondu »",
  },
  {
    key: "private_msg",
    label: "Messages privés",
    description: "Notification d'un nouveau message privé reçu.",
    examples: "« Vous avez un nouveau message »",
  },
  {
    key: "certificates",
    label: "Diplômes & certificats",
    description: "Diplôme prêt, demande de CNI, expédition.",
    examples: "« Votre diplôme est prêt »",
  },
  {
    key: "reactivation",
    label: "Relances d'inactivité",
    description: "Rappels aux élèves inactives. Désormais envoyées en NOTIFICATION (cloche + push), plus par email.",
    examples: "« On ne vous a pas vue depuis 7 jours 🌸 »",
  },
  {
    key: "announcements",
    label: "Annonces",
    description: "Annonces générales et actualités de la plateforme.",
    examples: "« Nouvelle session en direct »",
  },
  {
    key: "prospect",
    label: "Séquence prospects",
    description: "Emails marketing aux inscrits sans commande (J0 / J+2 / J+7 / J+14).",
    examples: "« Votre place vous attend »",
  },
];

export const EMAIL_CATEGORY_KEYS: string[] = EMAIL_CATEGORIES.map((c) => c.key);
