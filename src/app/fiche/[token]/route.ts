import { NextResponse, type NextRequest } from "next/server";
import { randomInt } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { enrollAfterPayment } from "@/lib/enrollment";
import { createAccessLink } from "@/lib/access-link";
import { sendEmail } from "@/lib/email";
import { ficheAccessEmail } from "@/lib/fiche-email";

export const dynamic = "force-dynamic";

/**
 * QR de la FICHE D'INSCRIPTION (paiement à la livraison) : /fiche/<jeton>.
 *
 *   • paiement PAS encore confirmé → page « en attente », AUCUN accès. La fiche
 *     voyage avec le livreur avant l'encaissement : la scanner ne doit rien donner.
 *   • paiement confirmé (dans Arazzo OS — « Confirmer », qui envoie déjà l'e-mail d'accès et
 *     pose `fiche_access_sent_at` — ou par le bouton du LMS) →
 *       connexion directe ; si l'e-mail d'accès n'est pas encore parti (confirmation faite
 *       dans le LMS), il part à ce 1er scan (e-mail + mot de passe). Aucun mot de passe
 *       n'est jamais réinitialisé une fois l'e-mail envoyé.
 *
 * Le jeton est aléatoire (256 bits), propre à UNE commande, et n'ouvre que le
 * compte de cette commande. Voir la migration 091.
 */

const PAYE = ["confirmed", "shipped", "delivered"];

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

function page(status: number, titre: string, corps: string, ton: "ok" | "attente" | "erreur" = "attente") {
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

  // Paiement pas encore encaissé et confirmé : on n'ouvre RIEN.
  if (!PAYE.includes(order.status ?? "")) {
    const prenom = esc((order.full_name ?? "").trim().split(/\s+/)[0] || "");
    return page(
      200,
      "تمّ تسجيلك بنجاح",
      `<p>مرحبا ${prenom ? `<b>${prenom}</b>` : ""}، تسجيلك تمّ بنجاح.</p>
       <p><b>دفعك عند الاستلام لم يتم تأكيده بعد.</b></p>
       <div class="encart">بمجرد تأكيد الدفع تصلك بياناتك (البريد الإلكتروني وكلمة السر) عبر البريد الإلكتروني، وبمسح هذا الرمز مرة أخرى تدخلين مباشرة إلى تكوينك.</div>`,
      "attente",
    );
  }

  // Paiement confirmé : compte + inscription aux cours (idempotent).
  const enr = await enrollAfterPayment(order.id);
  if (!enr.ok || !enr.userId) {
    return page(500, "تعذّر التفعيل", "<p>لم نتمكّن من فتح وصولك الآن. تواصلي معنا وسنحلّ الأمر فورا.</p>", "erreur");
  }

  // Première activation : identifiants par e-mail (une seule fois par commande).
  if (!order.fiche_access_sent_at && order.email) {
    let motDePasse: string | null = null;
    const { data: au } = await admin.auth.admin.getUserById(enr.userId);
    const creeAvecCetteCommande = au?.user?.created_at
      && new Date(au.user.created_at).getTime() >= new Date(order.created_at).getTime();
    // Un compte qui existait AVANT cette commande garde SON mot de passe.
    if (creeAvecCetteCommande) {
      const nouveau = genererMotDePasse();
      const { error } = await admin.auth.admin.updateUserById(enr.userId, { password: nouveau });
      if (!error) motDePasse = nouveau;
    }
    const lien = await createAccessLink(enr.userId);
    const titres = ((order.order_items as { title?: string | null }[]) ?? []).map((i) => i.title).filter(Boolean);
    const { subject, html } = ficheAccessEmail({
      name: order.full_name,
      email: order.email,
      password: motDePasse,
      formation: titres.length ? titres.join(" + ") : null,
      loginUrl: lien.ok && lien.url ? lien.url : process.env.NEXT_PUBLIC_SITE_URL || "https://www.formation-arazzo.store",
    });
    const r = await sendEmail({ to: order.email, category: "welcome", force: true, subject, html });
    // Marqué « envoyé » seulement si l'e-mail est parti : sinon le prochain scan réessaie.
    if (r.ok) await admin.from("orders").update({ fiche_access_sent_at: new Date().toISOString() }).eq("id", order.id);
  }

  // Connexion directe (lien branché, 48 h) → tableau de bord, cours inscrits.
  const acces = await createAccessLink(enr.userId);
  if (!acces.ok || !acces.url) {
    return page(500, "تعذّر الدخول التلقائي", "<p>وصولك جاهز، لكن الدخول التلقائي لم ينجح. استعملي البريد الإلكتروني الذي أرسلناه لك.</p>", "erreur");
  }
  return NextResponse.redirect(acces.url);
}
