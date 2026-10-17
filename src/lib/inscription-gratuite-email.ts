/**
 * E-mails du lien d'inscription gratuite : « Votre compte est prêt » (identifiant, mot de passe, cours gratuit,
 * plateforme, application) et « Vous avez déjà un compte » (aucun mot de passe changé).
 */

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://www.formation-arazzo.store";

const echap = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));

function cadre(contenu: string): string {
  return `
  <div style="font-family:'DM Sans',Arial,sans-serif;background:#F5F0EB;padding:32px 16px;">
    <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:18px;overflow:hidden;box-shadow:0 10px 40px -12px rgba(75,59,199,.18);">
      <div style="background:linear-gradient(135deg,#5B16F9,#2A0880);padding:30px;text-align:center;">
        <div style="font-size:26px;color:#fff;font-family:Georgia,serif;font-weight:bold;">✂ ARAZZO</div>
        <div style="font-size:13px;color:#FE7223;font-style:italic;margin-top:2px;">Formation</div>
      </div>
      <div style="padding:32px;color:#444;line-height:1.65;font-size:15px;">${contenu}</div>
      <div style="background:#F5F0EB;padding:16px;text-align:center;color:#999;font-size:12px;">${SITE.replace(/^https?:\/\//, "")}</div>
    </div>
  </div>`;
}

const bouton = (href: string, texte: string, fond: string) =>
  `<a href="${href}" style="display:block;background:${fond};color:#fff;padding:14px 20px;border-radius:12px;text-decoration:none;font-weight:bold;font-size:15px;text-align:center;margin:10px 0;">${texte}</a>`;

export function emailCompteCree(p: { nom: string; email: string; motDePasse: string; coursHref: string | null; coursTitre: string | null }): { subject: string; html: string } {
  const prenom = echap(p.nom.split(" ")[0] || "");
  const connexion = `${SITE}/login?email=${encodeURIComponent(p.email)}`;
  const html = cadre(`
    <h2 style="color:#5B16F9;font-family:Georgia,serif;margin:0 0 12px;">Bienvenue ${prenom} 🎉</h2>
    <p>Votre compte Arazzo est créé${p.coursTitre ? ` et votre cours gratuit « <strong>${echap(p.coursTitre)}</strong> » vous attend` : ""}.</p>
    <div style="background:#F6F2FF;border-radius:12px;padding:14px 16px;margin:16px 0;">
      <div style="font-size:13px;color:#666;">Votre identifiant</div>
      <div style="font-size:16px;font-weight:bold;color:#2A0880;user-select:all;">${echap(p.email)}</div>
      <div style="font-size:13px;color:#666;margin-top:10px;">Votre mot de passe</div>
      <div style="font-size:20px;font-weight:bold;letter-spacing:1px;color:#2A0880;font-family:monospace;user-select:all;">${echap(p.motDePasse)}</div>
    </div>
    ${p.coursHref ? bouton(p.coursHref, "▶ Regarder mon cours gratuit", "#FE7223") : ""}
    ${bouton(connexion, "Ouvrir la plateforme Arazzo", "#5B16F9")}
    ${bouton(`${SITE}/application`, "📲 Installer l'application sur mon téléphone", "#2A0880")}
    <p style="font-size:13px;color:#888;margin-top:16px;">Gardez cet e-mail. Vous pouvez changer votre mot de passe à tout moment dans votre profil.</p>`);
  return { subject: "🎁 Votre compte Arazzo est prêt — votre cours gratuit vous attend", html };
}

export function emailDejaInscrite(p: { nom: string; email: string; lienMotDePasse: string | null; coursHref: string | null; coursTitre: string | null }): { subject: string; html: string } {
  const prenom = echap(p.nom.split(" ")[0] || "");
  const connexion = `${SITE}/login?email=${encodeURIComponent(p.email)}`;
  const html = cadre(`
    <h2 style="color:#5B16F9;font-family:Georgia,serif;margin:0 0 12px;">Bon retour ${prenom} 👋</h2>
    <p>Vous avez déjà un compte Arazzo avec l'adresse <strong>${echap(p.email)}</strong>${p.coursTitre ? ` : votre cours gratuit « <strong>${echap(p.coursTitre)}</strong> » est prêt` : ""}.</p>
    ${p.coursHref ? bouton(p.coursHref, "▶ Regarder mon cours gratuit", "#FE7223") : ""}
    ${bouton(connexion, "Me connecter", "#5B16F9")}
    ${p.lienMotDePasse ? `<p style="font-size:13px;color:#888;">Mot de passe oublié ? <a href="${p.lienMotDePasse}" style="color:#5B16F9;">Choisir un nouveau mot de passe</a></p>` : ""}
    ${bouton(`${SITE}/application`, "📲 Installer l'application sur mon téléphone", "#2A0880")}`);
  return { subject: "Votre cours gratuit Arazzo vous attend", html };
}
