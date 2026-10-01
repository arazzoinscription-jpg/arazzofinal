/**
 * E-mail d'accès envoyé au PREMIER scan du QR d'une fiche d'inscription (paiement à la
 * livraison). Il donne TOUJOURS accès à la plateforme (e-mail + mot de passe + bouton),
 * mais dit clairement ce qui est disponible :
 *
 *   - paiement PAS encore confirmé par l'école → compte ouvert, AUCUN cours inscrit ; les
 *     cours apparaîtront dès que l'administration de l'école confirme le paiement ;
 *   - paiement confirmé → les cours sont déjà dans l'espace de la cliente.
 *
 * Deux cas pour les identifiants :
 *   - compte créé par cette commande → e-mail + MOT DE PASSE ;
 *   - compte qui existait déjà → AUCUN mot de passe (celui de la personne reste intact).
 *
 * Arabe (langue des clientes, de droite à gauche) puis français. Même habillage violet /
 * orange que les autres e-mails du site.
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
  /** Le paiement est-il déjà confirmé par l'école ? */
  paid: boolean;
  /** Lien du bouton « Accéder à la plateforme » (connexion directe, ou page de connexion). */
  loginUrl: string;
}): { subject: string; html: string } {
  const prenom = String(opts.name ?? "").trim().split(/\s+/)[0] || "";
  const formation = opts.formation ? esc(opts.formation) : "";

  const idsAr = opts.password
    ? `<div style="margin:16px 0;padding:16px 18px;background:#F6F3FF;border-radius:12px;">
         <p style="margin:0 0 6px;color:#6b6480;font-size:13px;">بيانات الدخول الخاصة بك</p>
         <p style="margin:0;font-size:15px;"><b>البريد الإلكتروني :</b> <span dir="ltr">${esc(opts.email)}</span></p>
         <p style="margin:6px 0 0;font-size:15px;"><b>كلمة السر :</b>
           <span dir="ltr" style="font-family:monospace;font-size:17px;font-weight:700;letter-spacing:1px;">${esc(opts.password)}</span></p>
       </div>`
    : `<p style="margin:12px 0 0;">ادخلي بالبريد الإلكتروني <b dir="ltr">${esc(opts.email)}</b> وكلمة السر المعتادة
       (« نسيت كلمة السر » في صفحة الدخول عند الحاجة).</p>`;
  const idsFr = opts.password
    ? `<p style="margin:6px 0;font-size:14px;"><b>E-mail :</b> ${esc(opts.email)} &nbsp;·&nbsp; <b>Mot de passe :</b>
         <span style="font-family:monospace;font-weight:700;">${esc(opts.password)}</span></p>`
    : `<p style="margin:6px 0;font-size:14px;">Connectez-vous avec <b>${esc(opts.email)}</b> et votre mot de passe habituel.</p>`;

  const messageAr = opts.paid
    ? `<p style="margin:0;">تمّ تأكيد دفعك. ${formation ? `تكوينك <b>${formation}</b> متوفّر الآن في فضائك.` : "تكوينك متوفّر الآن في فضائك."}</p>`
    : `<div style="margin:14px 0 0;padding:12px 16px;background:#fff4e5;border-radius:12px;color:#8a5a00;">
         حسابك على المنصة جاهز. <b>ستظهر دوراتك في فضائك بمجرد تأكيد الدفع من طرف إدارة المدرسة.</b>
         يمكنك الدخول الآن والتعرّف على المنصة.</div>`;
  const messageFr = opts.paid
    ? `Votre paiement est confirmé : ${formation ? `<b>${formation}</b> est` : "votre formation est"} disponible dans votre espace.`
    : `Votre compte est prêt. <b>Vos cours apparaîtront dans votre espace dès que l'administration de l'école aura confirmé votre paiement.</b> Vous pouvez déjà vous connecter et découvrir la plateforme.`;

  const html = `
  <div style="font-family:'IBM Plex Sans Arabic','DM Sans',Arial,sans-serif;background:#F5F0EB;padding:32px 16px;">
    <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:18px;overflow:hidden;box-shadow:0 10px 40px -12px rgba(75,59,199,.18);">
      <div style="background:linear-gradient(135deg,#2A0880,#5B16F9);padding:26px;text-align:center;">
        <img src="${SITE}/arazzo-icon.png" width="64" height="64" alt="Arazzo" style="border-radius:50%;background:#fff;border:3px solid #FE7223;padding:4px;">
        <div style="font-size:24px;color:#fff;font-weight:bold;letter-spacing:1px;margin-top:8px;">أرازو · ARAZZO</div>
        <div style="font-size:13px;color:#D9C9FF;margin-top:2px;">للتكوين في الخياطة · Formation</div>
      </div>
      <div dir="rtl" style="padding:30px 32px 10px;color:#444;line-height:1.9;font-size:15px;text-align:right;">
        <h2 style="color:#5B16F9;margin:0 0 12px;">🔑 هذا هو وصولك إلى المنصة</h2>
        <p style="margin:0 0 8px;">${prenom ? `مرحبا ${esc(prenom)}،` : "مرحبا،"}</p>
        ${messageAr}
        ${idsAr}
        <div style="text-align:center;margin:22px 0 6px;">
          <a href="${esc(opts.loginUrl)}" style="display:inline-block;background:#128a4c;color:#fff;padding:14px 32px;border-radius:12px;text-decoration:none;font-weight:bold;font-size:16px;">الدخول إلى المنصة</a>
        </div>
      </div>
      <div dir="ltr" style="margin:6px 32px 0;padding:18px 0 4px;border-top:1px dashed #E07840;color:#666;font-size:14px;line-height:1.7;">
        <p style="margin:0 0 6px;"><b>Voici votre accès à la plateforme.</b> ${prenom ? `Bonjour ${esc(prenom)},` : ""}</p>
        <p style="margin:0 0 6px;">${messageFr}</p>
        ${idsFr}
        <p style="text-align:center;margin:14px 0 4px;"><a href="${esc(opts.loginUrl)}" style="color:#128a4c;font-weight:bold;">Accéder à la plateforme</a></p>
      </div>
      <div style="padding:16px;text-align:center;color:#999;font-size:12px;background:#F5F0EB;margin-top:14px;">
        أرازو للتكوين — سطيف · Arazzo Formation — Sétif · <a href="${SITE}" style="color:#5B16F9;text-decoration:none;">formation-arazzo.store</a>
      </div>
    </div>
  </div>`;

  return { subject: "🔑 وصولك إلى منصة أرازو — Votre accès à la plateforme Arazzo", html };
}
