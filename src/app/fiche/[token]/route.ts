import { NextResponse, type NextRequest } from "next/server";
import { randomInt } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { enrollAfterPayment, ensureOrderAccount } from "@/lib/enrollment";
import { createAccessLink } from "@/lib/access-link";
import { sendEmail } from "@/lib/email";
import { ficheAccessEmail } from "@/lib/fiche-email";

export const dynamic = "force-dynamic";

/**
 * QR de la FICHE D'INSCRIPTION (paiement à la livraison) : /fiche/<jeton>.
 *
 * Le QR donne TOUJOURS accès à la plateforme (même scanné par le livreur : sans risque) :
 *   • 1er scan → le compte est créé (SANS aucun cours tant que le paiement n'est pas confirmé),
 *     un e-mail part avec e-mail + mot de passe + bouton « Accéder à la plateforme », et la page
 *     dit « voici votre accès » avec le même bouton ;
 *   • paiement PAS encore confirmé par l'école → message clair : les cours apparaîtront dès la
 *     confirmation par l'administration ;
 *   • paiement confirmé (bouton « Confirmer » d'Arazzo OS, qui inscrit aux cours) → les cours sont
 *     dans l'espace ; le scan ouvre directement la plateforme.
 * Aucun mot de passe n'est jamais réinitialisé une fois l'e-mail envoyé, et un compte qui
 * existait déjà n'est jamais ouvert par un simple scan avant confirmation du paiement.
 *
 * Le jeton est aléatoire (256 bits), propre à UNE commande. Voir la migration 091.
 */

const PAYE = ["confirmed", "shipped", "delivered"];
const SITE = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.formation-arazzo.store").replace(/\/$/, "");

/** Mot de passe lisible (sans 0/O/1/l/I ambigus), tiré du générateur cryptographique. */
function genererMotDePasse(longueur = 10): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < longueur; i += 1) out += alphabet[randomInt(alphabet.length)];
  return out;
}

/** Échappe le texte venu d'un formulaire public avant de l'insérer dans du HTML. */
function esc(s: unknown) {
  return String(s ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function page(status: number, titre: string, corps: string, ton: "ok" | "attente" | "erreur" = "attente", action?: { href: string; label: string }) {
  const couleur = ton === "ok" ? "#128a4c" : ton === "erreur" ? "#b3261e" : "#5B16F9";
  const fond = ton === "ok" ? "#e6f6ee" : ton === "erreur" ? "#fdecea" : "#efe8ff";
  const icone = ton === "ok" ? "✓" : ton === "erreur" ? "!" : "⏳";
  const html = `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">
<title>${titre} — أرازو للتكوين</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;700&display=swap">
<style>
  *{box-sizing:border-box}
  body{margin:0;min-height:100vh;font-family:'IBM Plex Sans Arabic','Segoe UI',Tahoma,Arial,sans-serif;color:#2b2444;
    background:radial-gradient(120% 70% at 100% 0%,#e9defe 0%,transparent 60%),radial-gradient(100% 60% at 0% 100%,#ffe9da 0%,transparent 55%),#f6f3ff;
    display:flex;align-items:center;justify-content:center;padding:20px}
  main{width:100%;max-width:460px;background:#fff;border-radius:28px;overflow:hidden;box-shadow:0 28px 60px -26px rgba(75,59,199,.45)}
  header{background:linear-gradient(135deg,#2A0880 0%,#5B16F9 100%);padding:26px 20px 22px;text-align:center;color:#fff}
  .logo{width:84px;height:84px;margin:0 auto 10px;border-radius:50%;background:#fff;display:grid;place-items:center;border:4px solid #FE7223;box-shadow:0 10px 24px rgba(0,0,0,.28)}
  .logo img{width:58px;height:58px;object-fit:contain}
  .marque{font-size:1.55rem;font-weight:700;letter-spacing:.5px}
  .sous-marque{font-size:.82rem;color:#d9c9ff;margin-top:2px}
  .couture{border:0;border-top:3px dashed #FE7223;margin:0}
  .corps{padding:28px 26px 8px;text-align:center}
  .pastille{width:64px;height:64px;border-radius:50%;margin:0 auto 14px;display:grid;place-items:center;font-size:30px;font-weight:700;background:${fond};color:${couleur}}
  h1{font-size:1.45rem;color:${couleur};margin:0 0 14px;line-height:1.4}
  .texte{line-height:1.95;color:#4a4468;font-size:1.02rem}
  .texte p{margin:0 0 10px}
  .encart{background:#fff4e5;border-radius:16px;padding:12px 16px;color:#8a5a00;font-size:.95rem;line-height:1.8;margin:14px 0 4px}
  footer{padding:18px 20px 22px;text-align:center;font-size:.82rem;color:#8b85a0}
  footer b{color:#5B16F9}
  .bouton{display:inline-block;margin:10px 0 18px;background:#128a4c;color:#fff;padding:15px 34px;border-radius:14px;text-decoration:none;font-weight:700;font-size:1.05rem;box-shadow:0 12px 24px -12px rgba(18,138,76,.7)}
</style></head>
<body>
<main>
  <header>
    <div class="logo"><img src="/arazzo-icon.png" alt="أرازو"></div>
    <div class="marque">أرازو</div>
    <div class="sous-marque">للتكوين في الخياطة والباترون</div>
  </header>
  <hr class="couture">
  <section class="corps">
    <div class="pastille">${icone}</div>
    <h1>${titre}</h1>
    <div class="texte">${corps}</div>
    ${action ? `<a class="bouton" href="${action.href}">${action.label}</a>` : ""}
  </section>
  <footer><b>أرازو للتكوين</b> — مدرسة الخياطة، سطيف</footer>
</main></body></html>`;
  return new NextResponse(html, { status, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
}

export async function GET(_req: NextRequest, { params }: { params: { token: string } }) {
  const token = (params.token ?? "").trim();
  if (!/^[a-f0-9]{32,64}$/i.test(token)) {
    return page(404, "الرمز غير صالح", "<p>هذا الرمز غير صالح. تأكّدي أنه الرمز المطبوع على بطاقة تسجيلك.</p>", "erreur");
  }

  const admin = createAdminClient();
  const { data: order } = await admin
    .from("orders")
    .select("id, status, email, full_name, payment_method, created_at, fiche_access_sent_at, order_items(title)")
    .eq("fiche_token", token)
    .maybeSingle();
  if (!order || order.payment_method !== "cod") {
    return page(404, "الرمز غير معروف", "<p>هذا الرمز غير مرتبط بأي تسجيل. تأكّدي أنه الرمز المطبوع على بطاقة تسجيلك.</p>", "erreur");
  }

  const paye = PAYE.includes(order.status ?? "");
  const prenom = esc((order.full_name ?? "").trim().split(/\s+/)[0] || "");

  // 1) Le compte. TOUJOURS ouvert : le QR donne accès à la plateforme dès le 1er scan, même
  //    si c'est le livreur qui le scanne. Les COURS, eux, n'arrivent qu'une fois le paiement
  //    confirmé par l'école : avant, compte SEUL (aucune inscription) ; après, inscription.
  let userId: string | null = null;
  if (paye) {
    const enr = await enrollAfterPayment(order.id);
    if (enr.ok) userId = enr.userId;
  } else {
    const acc = await ensureOrderAccount(order.id);
    if (acc.ok) userId = acc.userId;
  }
  if (!userId) {
    return page(500, "تعذّر التفعيل", "<p>لم نتمكّن من فتح وصولك الآن. تواصلي معنا وسنحلّ الأمر فورا.</p>", "erreur");
  }

  // Compte NEUF de cette commande (créé depuis, jamais connecté) : on peut sans risque lui
  // donner un mot de passe et une connexion directe. Un compte qui existait déjà garde SON
  // mot de passe et n'est jamais ouvert par un simple scan avant confirmation du paiement.
  const { data: au } = await admin.auth.admin.getUserById(userId);
  const compteDeCetteCommande = Boolean(
    au?.user?.created_at
    && new Date(au.user.created_at).getTime() >= new Date(order.created_at).getTime()
    && !au.user.last_sign_in_at,
  );
  const connexionDirecte = compteDeCetteCommande || paye;

  // 2) E-mail d'accès (une seule fois par commande) : e-mail + mot de passe + bouton, avec un
  //    message clair sur ce qui est disponible (cours dès la confirmation du paiement).
  let emailJusteEnvoye = false;
  if (!order.fiche_access_sent_at && order.email) {
    let motDePasse: string | null = null;
    if (compteDeCetteCommande) {
      const nouveau = genererMotDePasse();
      const { error } = await admin.auth.admin.updateUserById(userId, { password: nouveau });
      if (!error) motDePasse = nouveau;
    }
    const lienMail = connexionDirecte ? await createAccessLink(userId) : null;
    const titres = ((order.order_items as { title?: string | null }[]) ?? []).map((i) => i.title).filter(Boolean);
    const { subject, html } = ficheAccessEmail({
      name: order.full_name,
      email: order.email,
      password: motDePasse,
      formation: titres.length ? titres.join(" + ") : null,
      paid: paye,
      loginUrl: lienMail?.ok && lienMail.url ? lienMail.url : `${SITE}/connexion`,
    });
    const r = await sendEmail({ to: order.email, category: "welcome", force: true, subject, html });
    // Marqué « envoyé » seulement si l'e-mail est parti : sinon le prochain scan réessaie.
    if (r.ok) {
      await admin.from("orders").update({ fiche_access_sent_at: new Date().toISOString() }).eq("id", order.id);
      emailJusteEnvoye = true;
    }
  }

  // 3) La page : « voici votre accès à la plateforme » + bouton d'entrée.
  const acces = connexionDirecte ? await createAccessLink(userId) : null;
  const href = acces?.ok && acces.url ? acces.url : `${SITE}/connexion`;
  const messageCours = paye
    ? "<p><b>تمّ تأكيد دفعك.</b> تكوينك متوفّر الآن في فضائك.</p>"
    : `<div class="encart">حسابك على المنصة جاهز. <b>ستظهر دوراتك في فضائك بمجرد تأكيد الدفع من طرف إدارة المدرسة.</b> يمكنك الدخول الآن والتعرّف على المنصة.</div>`;
  const messageMail = emailJusteEnvoye
    ? "<p>أرسلنا إلى بريدك الإلكتروني بيانات الدخول (البريد الإلكتروني وكلمة السر).</p>"
    : (order.fiche_access_sent_at ? "<p>بيانات الدخول أُرسلت إلى بريدك الإلكتروني.</p>" : "");
  return page(
    200,
    "هذا هو وصولك إلى المنصة",
    `<p>مرحبا ${prenom ? `<b>${prenom}</b>` : ""}، تسجيلك تمّ بنجاح.</p>${messageCours}${messageMail}`,
    "ok",
    { href, label: "الدخول إلى المنصة" },
  );
}
