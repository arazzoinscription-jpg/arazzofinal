import { Resend } from "resend";

// Fallback au build/preview pour éviter que le constructeur ne jette
// quand la clé n'est pas injectée (la vraie clé est utilisée en production).
export const resend = new Resend(process.env.RESEND_API_KEY || "re_placeholder_build_key");
const FROM = process.env.RESEND_FROM || "noreply@arazzo.formation";

export async function sendWelcomeEmail(to: string, nom: string) {
  await resend.emails.send({
    from: FROM,
    to,
    subject: "Bienvenue sur Arazzo Formation ! 🎓",
    html: `
      <div style="font-family:DM Sans,sans-serif;background:#F5F0EB;padding:40px;">
        <div style="max-width:600px;margin:0 auto;background:white;border-radius:16px;overflow:hidden;">
          <div style="background:#4B3BC7;padding:32px;text-align:center;">
            <h1 style="color:white;font-family:serif;margin:0;">✂️ Arazzo Formation</h1>
          </div>
          <div style="padding:32px;">
            <h2 style="color:#4B3BC7;">Bienvenue, ${nom} !</h2>
            <p style="color:#333;line-height:1.6;">
              Votre compte Arazzo Formation est maintenant actif.
              Découvrez nos formations en couture, broderie et modélisme.
            </p>
            <a href="${process.env.NEXT_PUBLIC_SITE_URL}/formations"
               style="display:inline-block;background:#E07840;color:white;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600;margin-top:16px;">
              Explorer les formations
            </a>
          </div>
          <div style="background:#F5F0EB;padding:16px;text-align:center;color:#888;font-size:14px;">
            <a href="${process.env.NEXT_PUBLIC_SITE_URL}" style="color:#4B3BC7;">arazzo.formation</a>
          </div>
        </div>
      </div>
    `,
  });
}

export async function sendPurchaseConfirmationEmail(
  to: string,
  nom: string,
  courseTitre: string,
  dashboardUrl: string
) {
  await resend.emails.send({
    from: FROM,
    to,
    subject: `Accès confirmé — ${courseTitre}`,
    html: `
      <div style="font-family:DM Sans,sans-serif;background:#F5F0EB;padding:40px;">
        <div style="max-width:600px;margin:0 auto;background:white;border-radius:16px;overflow:hidden;">
          <div style="background:#4B3BC7;padding:32px;text-align:center;">
            <h1 style="color:white;font-family:serif;margin:0;">✂️ Arazzo Formation</h1>
          </div>
          <div style="padding:32px;">
            <h2 style="color:#4B3BC7;">Paiement confirmé !</h2>
            <p style="color:#333;line-height:1.6;">
              Bonjour ${nom},<br/><br/>
              Votre accès à <strong>${courseTitre}</strong> est activé.
              Vous pouvez commencer à apprendre dès maintenant.
            </p>
            <a href="${dashboardUrl}"
               style="display:inline-block;background:#E07840;color:white;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600;margin-top:16px;">
              Accéder au cours
            </a>
          </div>
          <div style="background:#F5F0EB;padding:16px;text-align:center;color:#888;font-size:14px;">
            <a href="${process.env.NEXT_PUBLIC_SITE_URL}" style="color:#4B3BC7;">arazzo.formation</a>
          </div>
        </div>
      </div>
    `,
  });
}

export async function sendCertificateEmail(
  to: string,
  nom: string,
  courseTitre: string,
  certificateUrl: string
) {
  await resend.emails.send({
    from: FROM,
    to,
    subject: `🎓 Votre certificat — ${courseTitre}`,
    html: `
      <div style="font-family:DM Sans,sans-serif;background:#F5F0EB;padding:40px;">
        <div style="max-width:600px;margin:0 auto;background:white;border-radius:16px;overflow:hidden;">
          <div style="background:#4B3BC7;padding:32px;text-align:center;">
            <h1 style="color:white;font-family:serif;margin:0;">✂️ Arazzo Formation</h1>
          </div>
          <div style="padding:32px;text-align:center;">
            <div style="font-size:64px;">🎓</div>
            <h2 style="color:#4B3BC7;">Félicitations, ${nom} !</h2>
            <p style="color:#333;line-height:1.6;">
              Vous avez terminé <strong>${courseTitre}</strong>.
              Votre certificat est prêt à être téléchargé.
            </p>
            <a href="${certificateUrl}"
               style="display:inline-block;background:#E07840;color:white;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600;margin-top:16px;">
              Télécharger mon certificat
            </a>
          </div>
          <div style="background:#F5F0EB;padding:16px;text-align:center;color:#888;font-size:14px;">
            <a href="${process.env.NEXT_PUBLIC_SITE_URL}" style="color:#4B3BC7;">arazzo.formation</a>
          </div>
        </div>
      </div>
    `,
  });
}

export async function sendMagicLinkEmail(
  to: string,
  nom: string,
  magicLink: string
) {
  await resend.emails.send({
    from: FROM,
    to,
    subject: "Votre lien de connexion Arazzo Formation",
    html: `
      <div style="font-family:DM Sans,sans-serif;background:#F5F0EB;padding:40px;">
        <div style="max-width:600px;margin:0 auto;background:white;border-radius:16px;overflow:hidden;">
          <div style="background:#4B3BC7;padding:32px;text-align:center;">
            <h1 style="color:white;font-family:serif;margin:0;">✂️ Arazzo Formation</h1>
          </div>
          <div style="padding:32px;">
            <h2 style="color:#4B3BC7;">Bonjour ${nom},</h2>
            <p style="color:#333;line-height:1.6;">
              Votre compte a été migré depuis notre ancienne plateforme.
              Cliquez ci-dessous pour vous connecter et définir votre mot de passe.
            </p>
            <a href="${magicLink}"
               style="display:inline-block;background:#E07840;color:white;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600;margin-top:16px;">
              Accéder à mon espace
            </a>
            <p style="color:#888;font-size:13px;margin-top:16px;">Ce lien expire dans 24 heures.</p>
          </div>
        </div>
      </div>
    `,
  });
}
