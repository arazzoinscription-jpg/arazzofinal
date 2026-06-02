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
  | "announcements";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://arazzo-bice.vercel.app";

/** Layout HTML commun (responsive, identité violet/orange). */
function layout(opts: { title: string; body: string; cta?: { label: string; href: string } }) {
  return `
  <div style="font-family:'DM Sans',Arial,sans-serif;background:#F5F0EB;padding:32px 16px;">
    <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:18px;overflow:hidden;box-shadow:0 10px 40px -12px rgba(75,59,199,.18);">
      <div style="background:linear-gradient(135deg,#4B3BC7,#2B2180);padding:30px;text-align:center;">
        <div style="font-size:26px;color:#fff;font-family:Georgia,serif;font-weight:bold;letter-spacing:1px;">✂ ARAZZO</div>
        <div style="font-size:13px;color:#E07840;font-style:italic;margin-top:2px;">Formation</div>
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
