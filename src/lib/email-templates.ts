/**
 * Templates d'emails Arazzo Formation.
 * Chaque fonction retourne { subject, html }.
 * Catégorie = clé de la table email_preferences (pour l'opt-out).
 */

export type EmailCategory =
  | "welcome"
  | "purchases"
  | "new_content"
  | "teacher_reply"
  | "private_msg"
  | "certificates"
  | "reactivation"
  | "announcements"
  | "prospect";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://www.formation-arazzo.store";

/**
 * Layout HTML commun (responsive, identité violet/orange).
 * `logoUrl` et `signature` sont optionnels : ils permettent aux emails prospect
 * de reprendre le logo/la signature configurés en administration sans dupliquer
 * le gabarit (rétro-compatible : les appels existants restent inchangés).
 */
function layout(opts: {
  title: string;
  body: string;
  cta?: { label: string; href: string };
  logoUrl?: string | null;
  signature?: string | null;
}) {
  const header = opts.logoUrl
    ? `<img src="${opts.logoUrl}" alt="Arazzo Formation" style="max-height:44px;max-width:200px;" />`
    : `<div style="font-size:26px;color:#fff;font-family:Georgia,serif;font-weight:bold;letter-spacing:1px;">✂ ARAZZO</div>
       <div style="font-size:13px;color:#E07840;font-style:italic;margin-top:2px;">Formation</div>`;
  return `
  <div style="font-family:'DM Sans',Arial,sans-serif;background:#F5F0EB;padding:32px 16px;">
    <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:18px;overflow:hidden;box-shadow:0 10px 40px -12px rgba(75,59,199,.18);">
      <div style="background:linear-gradient(135deg,#4B3BC7,#2B2180);padding:30px;text-align:center;">
        ${header}
      </div>
      <div style="padding:34px;">
        <h2 style="color:#4B3BC7;font-family:Georgia,serif;margin:0 0 14px;">${opts.title}</h2>
        <div style="color:#444;line-height:1.65;font-size:15px;">${opts.body}</div>
        ${
          opts.cta
            ? `<div style="text-align:center;margin:28px 0 8px;">
                 <a href="${opts.cta.href}" style="display:inline-block;background:#E07840;color:#fff;padding:14px 30px;border-radius:12px;text-decoration:none;font-weight:bold;font-size:15px;">${opts.cta.label}</a>
               </div>`
            : ""
        }
        ${
          opts.signature
            ? `<div style="margin-top:26px;padding-top:16px;border-top:1px solid #eee;color:#666;font-size:14px;line-height:1.5;">${opts.signature}</div>`
            : ""
        }
      </div>
      <div style="background:#F5F0EB;padding:16px;text-align:center;color:#999;font-size:12px;">
        <a href="${SITE}" style="color:#4B3BC7;text-decoration:none;">arazzo.formation</a>
        &nbsp;·&nbsp;
        <a href="${SITE}/dashboard/preferences" style="color:#999;text-decoration:underline;">Gérer mes emails</a>
      </div>
    </div>
  </div>`;
}

// ─── 1. Bienvenue ─────────────────────────────────────────────────────────────
export function tplWelcome(nom: string) {
  return {
    category: "welcome" as EmailCategory,
    subject: "Bienvenue sur Arazzo Formation ! 🎓",
    html: layout({
      title: `Bienvenue ${nom} !`,
      body: `Votre compte est actif. Découvrez nos formations en couture, modélisme et patronage,
             créées par des formatrices du Maghreb. Votre talent commence ici.`,
      cta: { label: "Explorer les formations", href: `${SITE}/formations` },
    }),
  };
}

// ─── 2. Confirmation d'achat ──────────────────────────────────────────────────
export function tplPurchase(nom: string, coursTitre: string) {
  return {
    category: "purchases" as EmailCategory,
    subject: `Achat confirmé — ${coursTitre}`,
    html: layout({
      title: "Paiement confirmé ✓",
      body: `Bonjour ${nom},<br/><br/>Votre accès à <strong>${coursTitre}</strong> est activé.
             Vous pouvez commencer dès maintenant, à votre rythme.`,
      cta: { label: "Accéder au cours", href: `${SITE}/dashboard` },
    }),
  };
}

// ─── 3. Accès formation ───────────────────────────────────────────────────────
export function tplCourseAccess(nom: string, coursTitre: string) {
  return {
    category: "purchases" as EmailCategory,
    subject: `Votre accès à « ${coursTitre} » est prêt`,
    html: layout({
      title: "Accès débloqué 🔓",
      body: `Bonjour ${nom}, votre formation <strong>${coursTitre}</strong> est disponible
             dans votre espace. Bon apprentissage !`,
      cta: { label: "Commencer", href: `${SITE}/dashboard` },
    }),
  };
}

// ─── 4. Nouveau contenu ───────────────────────────────────────────────────────
export function tplNewContent(nom: string, coursTitre: string, quoi: string) {
  return {
    category: "new_content" as EmailCategory,
    subject: `Nouveau contenu — ${coursTitre} ✨`,
    html: layout({
      title: "Nouveau contenu disponible ✨",
      body: `Bonjour ${nom},<br/><br/>Du nouveau contenu vient d'être ajouté à
             <strong>${coursTitre}</strong> : <em>${quoi}</em>.`,
      cta: { label: "Voir le nouveau contenu", href: `${SITE}/dashboard` },
    }),
  };
}

// ─── 4 bis. Rappel d'échéance (abonnement par tranches) ───────────────────────
export function tplInstallmentReminder(
  nom: string,
  coursTitre: string,
  mois: number,
  totalMois: number,
  montant: string,
) {
  return {
    category: "purchases" as EmailCategory,
    subject: `Échéance ${mois}/${totalMois} — ${coursTitre} 📅`,
    html: layout({
      title: "Votre prochaine échéance",
      body: `Bonjour ${nom},<br/><br/>C'est le moment de régler la <strong>tranche ${mois} sur ${totalMois}</strong>
             de votre abonnement à <strong>${coursTitre}</strong> (${montant}).<br/><br/>
             Effectuez le virement, puis déposez votre reçu depuis vos commandes. Dès validation,
             le palier de chapitres suivant s'ouvre automatiquement. ✨`,
      cta: { label: "Régler mon échéance", href: `${SITE}/dashboard/commandes` },
    }),
  };
}

// ─── 5. Réponse du professeur ─────────────────────────────────────────────────
export function tplTeacherReply(nom: string, question: string) {
  return {
    category: "teacher_reply" as EmailCategory,
    subject: "Votre formatrice a répondu 💬",
    html: layout({
      title: "Nouvelle réponse 💬",
      body: `Bonjour ${nom}, votre formatrice a répondu à votre question :
             <br/><br/><em>« ${question} »</em>`,
      cta: { label: "Voir la réponse", href: `${SITE}/dashboard` },
    }),
  };
}

// ─── 6. Message privé ─────────────────────────────────────────────────────────
export function tplPrivateMessage(nom: string, deQui: string) {
  return {
    category: "private_msg" as EmailCategory,
    subject: `Nouveau message de ${deQui}`,
    html: layout({
      title: "Nouveau message privé ✉️",
      body: `Bonjour ${nom}, vous avez reçu un message de <strong>${deQui}</strong>.`,
      cta: { label: "Lire le message", href: `${SITE}/dashboard` },
    }),
  };
}

// ─── 7. Certificat obtenu ─────────────────────────────────────────────────────
export function tplCertificate(nom: string, coursTitre: string, certUrl: string) {
  return {
    category: "certificates" as EmailCategory,
    subject: `🎓 Votre certificat — ${coursTitre}`,
    html: layout({
      title: `Félicitations ${nom} ! 🎓`,
      body: `Vous avez terminé <strong>${coursTitre}</strong>. Votre certificat officiel
             (avec QR code de vérification) est prêt à télécharger.`,
      cta: { label: "Télécharger mon certificat", href: certUrl },
    }),
  };
}

// ─── 8. Félicitations fin de formation ───────────────────────────────────────
export function tplCongrats(nom: string, coursTitre: string) {
  return {
    category: "certificates" as EmailCategory,
    subject: `Bravo, formation terminée ! 🌟`,
    html: layout({
      title: `Bravo ${nom} ! 🌟`,
      body: `Vous avez complété 100% de <strong>${coursTitre}</strong>. Quel parcours !
             Continuez sur votre lancée avec une nouvelle formation.`,
      cta: { label: "Découvrir d'autres cours", href: `${SITE}/formations` },
    }),
  };
}

// ─── 9. Réactivation (inactivité) ────────────────────────────────────────────
export function tplReactivation(nom: string, stage: "reminder_7" | "motivation_14" | "direct_30", lien: string) {
  const textes = {
    reminder_7: {
      subject: "On ne vous a pas vue depuis 7 jours 🌸",
      title: "Votre atelier vous attend 🌸",
      body: `Bonjour ${nom}, cela fait une semaine ! Reprenez là où vous vous êtes arrêtée,
             quelques minutes suffisent pour avancer.`,
      label: "Reprendre ma formation",
    },
    motivation_14: {
      subject: "Votre talent mérite que vous continuiez ✨",
      title: "Un petit pas aujourd'hui ✨",
      body: `Bonjour ${nom}, 2 semaines sans couture ? Chaque leçon vous rapproche de votre objectif.
             Offrez-vous 10 minutes aujourd'hui.`,
      label: "Continuer",
    },
    direct_30: {
      subject: "Reprenez exactement où vous étiez 🧵",
      title: "Votre dernière leçon vous attend 🧵",
      body: `Bonjour ${nom}, voici un lien direct vers votre dernière leçon. Un clic et c'est reparti !`,
      label: "Ouvrir ma dernière leçon",
    },
  };
  const t = textes[stage];
  return {
    category: "reactivation" as EmailCategory,
    subject: t.subject,
    html: layout({ title: t.title, body: t.body, cta: { label: t.label, href: lien } }),
  };
}

// ─── 10. Annonce ──────────────────────────────────────────────────────────────
export function tplAnnouncement(nom: string, titre: string, message: string) {
  return {
    category: "announcements" as EmailCategory,
    subject: `📢 ${titre}`,
    html: layout({
      title: `📢 ${titre}`,
      body: `Bonjour ${nom},<br/><br/>${message}`,
      cta: { label: "Voir sur la plateforme", href: `${SITE}/dashboard` },
    }),
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// 11. Séquence PROSPECT (inscrits sans commande) — emails J0 / J+2 / J+7 / J+14
// ───────────────────────────────────────────────────────────────────────────
// Chaque email est éditable en administration (prospect_settings) : si un sujet
// ou un HTML personnalisé est fourni, il remplace le modèle par défaut ci-dessous.
// Catégorie « prospect » → respecte l'opt-out email_preferences.prospect.
// ═══════════════════════════════════════════════════════════════════════════

export type ProspectEmailKind = "welcome" | "reminder_2" | "reminder_7" | "reminder_14";

/** Habillage optionnel repris des paramètres admin. */
export interface ProspectBranding {
  signature?: string | null;
  logoUrl?: string | null;
  promoText?: string | null;
}

const PROSPECT_DEFAULTS: Record<
  ProspectEmailKind,
  (nom: string, b: ProspectBranding) => { subject: string; title: string; body: string; cta: { label: string; href: string } }
> = {
  welcome: (nom) => ({
    subject: "Bienvenue chez Arazzo Formation ! 🎓",
    title: `Bienvenue ${nom} !`,
    body: `Ravie de vous compter parmi nous. Arazzo, c'est l'atelier en ligne des passionnées de
           couture, modélisme et patronage du Maghreb — des formations claires, pas à pas, créées
           par des formatrices expertes.<br/><br/>
           🎬 <strong>Découvrez en 2 minutes comment utiliser Arazzo :</strong>
           <a href="${SITE}/formations" style="color:#4B3BC7;">voir la vidéo & les formations</a>.`,
    cta: { label: "Découvrir les formations", href: `${SITE}/formations` },
  }),
  reminder_2: (nom) => ({
    subject: "Votre place vous attend chez Arazzo ✂️",
    title: `${nom}, prête à commencer ?`,
    body: `Vous avez créé votre compte il y a quelques jours — il ne manque plus que votre première
           formation ! Avec Arazzo vous apprenez <strong>à votre rythme</strong>, où que vous soyez,
           avec un suivi et un certificat à la clé.<br/><br/>
           Nos formations les plus suivies vous attendent : couture, modélisme, patronage…
           Trouvez celle qui vous ressemble.`,
    cta: { label: "Voir les formations populaires", href: `${SITE}/formations` },
  }),
  reminder_7: (nom) => ({
    subject: "Elles ont osé se lancer — pourquoi pas vous ? 🌸",
    title: `${nom}, elles témoignent`,
    body: `« Je n'avais jamais touché une machine, aujourd'hui je couds mes propres modèles. »<br/>
           Des centaines d'élèves ont commencé exactement là où vous êtes.<br/><br/>
           Une question avant de vous lancer ? Consultez notre <a href="${SITE}/formations"
           style="color:#4B3BC7;">FAQ et nos conseils pour bien débuter</a> — tout est prévu pour
           vous accompagner du premier point d'aiguille jusqu'au certificat.`,
    cta: { label: "Commencer sereinement", href: `${SITE}/formations` },
  }),
  reminder_14: (nom, b) => ({
    subject: "Dernier rappel — votre atelier vous attend 🧵",
    title: `${nom}, on garde votre place ?`,
    body: `C'est notre dernier petit message : votre compte Arazzo est prêt et votre première
           formation n'attend que vous.${
             b.promoText
               ? `<br/><br/><div style="background:#FDF2E9;border:1px dashed #E07840;border-radius:12px;padding:14px 16px;color:#B45309;"><strong>🎁 ${b.promoText}</strong></div>`
               : ""
           }<br/><br/>Faites le premier pas aujourd'hui — vous ne le regretterez pas.`,
    cta: { label: "Profiter maintenant", href: `${SITE}/formations` },
  }),
};

/**
 * Construit un email prospect prêt à envoyer.
 * `overrides` (venus de prospect_settings) priment sur le modèle par défaut.
 */
export function renderProspectEmail(
  kind: ProspectEmailKind,
  nom: string,
  branding: ProspectBranding = {},
  overrides?: { subject?: string | null; html?: string | null },
): { category: EmailCategory; subject: string; html: string } {
  const def = PROSPECT_DEFAULTS[kind](nom, branding);
  const subject = overrides?.subject?.trim() || def.subject;

  // HTML personnalisé : on l'injecte dans le gabarit commun (logo/signature/footer).
  if (overrides?.html?.trim()) {
    const body = overrides.html.replace(/\{\{\s*nom\s*\}\}/gi, nom);
    return {
      category: "prospect",
      subject,
      html: layout({ title: def.title, body, cta: def.cta, logoUrl: branding.logoUrl, signature: branding.signature }),
    };
  }

  return {
    category: "prospect",
    subject,
    html: layout({
      title: def.title,
      body: def.body,
      cta: def.cta,
      logoUrl: branding.logoUrl,
      signature: branding.signature,
    }),
  };
}

/** Email d'inactivité longue (12 mois) — « Souhaitez-vous conserver votre compte ? ». */
export function tplAccountInactivity(nom: string, branding: ProspectBranding = {}) {
  return {
    category: "prospect" as EmailCategory,
    subject: "Souhaitez-vous conserver votre compte Arazzo ?",
    html: layout({
      title: `${nom}, votre compte est-il toujours utile ?`,
      body: `Cela fait un moment que nous ne vous avons pas vue sur Arazzo Formation.<br/><br/>
             Si vous souhaitez <strong>conserver votre compte</strong>, il vous suffit de vous
             reconnecter — tout y est intact. Sans nouvelle de votre part, votre compte pourra être
             archivé afin de protéger vos données.`,
      cta: { label: "Conserver mon compte", href: `${SITE}/login` },
      logoUrl: branding.logoUrl,
      signature: branding.signature,
    }),
  };
}
