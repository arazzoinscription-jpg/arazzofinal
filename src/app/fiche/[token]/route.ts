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
 *   • paiement confirmé par l'admin (bouton « Confirmer le paiement » du LMS) →
 *       1re fois : e-mail d'accès (e-mail + mot de passe) puis connexion directe ;
 *       ensuite : connexion directe (aucun mot de passe n'est réinitialisé).
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
  const icone = ton === "ok" ? "✅" : ton === "erreur" ? "⚠️" : "⏳";
  const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">
<title>${titre} — Arazzo Formation</title></head>
<body style="margin:0;font-family:'DM Sans',Arial,sans-serif;background:#f6f3ff;color:#2b2444;display:grid;place-items:center;min-height:100vh;padding:20px;">
<main style="max-width:440px;width:100%;background:#fff;border-radius:22px;padding:34px 26px;text-align:center;box-shadow:0 20px 50px -24px rgba(75,59,199,.35);">
  <div style="font-size:44px;">${icone}</div>
  <h1 style="font-family:Georgia,serif;color:${couleur};font-size:1.5rem;margin:10px 0 12px;">${titre}</h1>
  <div style="line-height:1.65;color:#4a4468;">${corps}</div>
  <p style="margin:26px 0 0;font-size:.85rem;color:#8b85a0;">Arazzo Formation — École de couture, Sétif</p>
</main></body></html>`;
  return new NextResponse(html, { status, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
}

export async function GET(_req: NextRequest, { params }: { params: { token: string } }) {
  const token = (params.token ?? "").trim();
  if (!/^[a-f0-9]{32,64}$/i.test(token)) {
    return page(404, "Code introuvable", "<p>Ce code n’est pas valide. Vérifiez qu’il s’agit bien du code imprimé sur votre fiche d’inscription.</p>", "erreur");
  }

  const admin = createAdminClient();
  const { data: order } = await admin
    .from("orders")
    .select("id, status, email, full_name, payment_method, created_at, fiche_access_sent_at, order_items(title)")
    .eq("fiche_token", token)
    .maybeSingle();
  if (!order || order.payment_method !== "cod") {
    return page(404, "Code introuvable", "<p>Ce code n’est associé à aucune inscription. Vérifiez qu’il s’agit bien du code imprimé sur votre fiche.</p>", "erreur");
  }

  // Paiement pas encore encaissé et confirmé : on n'ouvre RIEN.
  if (!PAYE.includes(order.status ?? "")) {
    return page(
      200,
      "Inscription enregistrée",
      `<p>Bonjour ${esc((order.full_name ?? "").split(" ")[0] || "")}, votre inscription est bien enregistrée.</p>
       <p><b>Votre paiement à la livraison n’est pas encore confirmé.</b></p>
       <p>Dès que le paiement est confirmé, <b>scannez de nouveau ce code</b> : vous recevrez vos identifiants par e-mail et votre accès sera ouvert avec votre formation.</p>`,
      "attente",
    );
  }

  // Paiement confirmé : compte + inscription aux cours (idempotent).
  const enr = await enrollAfterPayment(order.id);
  if (!enr.ok || !enr.userId) {
    return page(500, "Activation impossible", "<p>Nous n’avons pas pu ouvrir votre accès pour le moment. Contactez-nous, nous le réglons tout de suite.</p>", "erreur");
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
    return page(500, "Activation impossible", "<p>Votre accès est prêt, mais la connexion automatique a échoué. Utilisez l’e-mail que nous venons de vous envoyer.</p>", "erreur");
  }
  return NextResponse.redirect(acces.url);
}
