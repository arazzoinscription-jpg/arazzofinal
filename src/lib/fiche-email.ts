/**
 * E-mail d'accès envoyé quand une fiche d'inscription (paiement à la livraison) est
 * SCANNÉE après confirmation du paiement.
 *
 * Deux cas :
 *   - compte créé par cette commande → on envoie e-mail + MOT DE PASSE (comme l'e-mail
 *     de validation d'un paiement CCP dans Arazzo OS) ;
 *   - compte qui existait déjà → on n'envoie AUCUN mot de passe (celui de la personne
 *     reste intact) : juste le lien de connexion.
 *
 * Même habillage que les autres e-mails du site (violet / orange).
 */

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://www.formation-arazzo.store";

function esc(s: unknown) {
  return String(s ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function ficheAccessEmail(opts: {
  name?: string | null;
  email: string;
  /** Mot de passe généré, ou null si le compte existait déjà. */
  password: string | null;
  formation?: string | null;
  /** Lien de connexion direct (valable 48 h). */
  loginUrl: string;
}): { subject: string; html: string } {
  const prenom = String(opts.name ?? "").trim().split(/\s+/)[0] || "";
  const formation = opts.formation ? esc(opts.formation) : "votre formation";

  const identifiants = opts.password
    ? `<div style="margin:18px 0;padding:16px 18px;background:#F6F3FF;border-radius:12px;">
         <p style="margin:0 0 6px;color:#6b6480;font-size:13px;">Vos identifiants de connexion</p>
         <p style="margin:0;font-size:15px;"><b>E-mail :</b> ${esc(opts.email)}</p>
         <p style="margin:6px 0 0;font-size:15px;"><b>Mot de passe :</b>
           <span style="font-family:monospace;font-size:17px;font-weight:700;letter-spacing:1px;">${esc(opts.password)}</span></p>
       </div>
       <p style="margin:0 0 6px;color:#666;font-size:13px;">Vous pourrez le changer depuis votre espace, dans « Mon profil ».</p>`
    : `<p style="margin:14px 0 0;">Connectez-vous avec votre e-mail <b>${esc(opts.email)}</b> et votre mot de passe habituel
       (« mot de passe oublié » sur la page de connexion si besoin).</p>`;

  const html = `
  <div style="font-family:'DM Sans',Arial,sans-serif;background:#F5F0EB;padding:32px 16px;">
    <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:18px;overflow:hidden;box-shadow:0 10px 40px -12px rgba(75,59,199,.18);">
      <div style="background:linear-gradient(135deg,#4B3BC7,#2B2180);padding:30px;text-align:center;">
        <div style="font-size:26px;color:#fff;font-family:Georgia,serif;font-weight:bold;letter-spacing:1px;">✂ ARAZZO</div>
        <div style="font-size:13px;color:#E07840;font-style:italic;margin-top:2px;">Formation</div>
      </div>
      <div style="padding:34px;color:#444;line-height:1.65;font-size:15px;">
        <h2 style="color:#4B3BC7;font-family:Georgia,serif;margin:0 0 14px;">🎉 Votre accès est prêt</h2>
        <p style="margin:0 0 10px;">${prenom ? `Bonjour ${esc(prenom)},` : "Bonjour,"}</p>
        <p style="margin:0;">Votre paiement à la livraison est bien confirmé. Vous avez maintenant accès à ${formation}.</p>
        ${identifiants}
        <div style="text-align:center;margin:24px 0 8px;">
          <a href="${esc(opts.loginUrl)}" style="display:inline-block;background:#128a4c;color:#fff;padding:14px 30px;border-radius:12px;text-decoration:none;font-weight:bold;font-size:15px;">Accéder à ma formation</a>
        </div>
        <p style="margin:0;text-align:center;color:#9ca3af;font-size:12px;">Ce bouton vous connecte directement (valable 48 h).</p>
        <p style="margin-top:26px;padding-top:16px;border-top:1px solid #eee;color:#666;font-size:14px;">Arazzo Formation — École de couture, Sétif</p>
      </div>
      <div style="background:#F5F0EB;padding:16px;text-align:center;color:#999;font-size:12px;">
        <a href="${SITE}" style="color:#4B3BC7;text-decoration:none;">formation-arazzo.store</a>
      </div>
    </div>
  </div>`;

  return { subject: "🎉 Votre accès Arazzo Formation est prêt", html };
}
