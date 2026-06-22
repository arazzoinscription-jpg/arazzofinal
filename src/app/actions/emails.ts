"use server";

import { createElement } from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email";
import { createMagicLink } from "@/lib/magic-link";
import { OrderReceivedEmail } from "@/emails/order-received";
import { PaymentApprovedEmail } from "@/emails/payment-approved";
import { CourseAccessEmail } from "@/emails/course-access";
import { PaymentRejectedEmail } from "@/emails/payment-rejected";
import { ResubmitProofEmail } from "@/emails/resubmit-proof";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://www.formation-arazzo.store";

// Rend un composant email en HTML (compatible clients mail).
// react-dom/server est importé dynamiquement : un fichier "use server" ne peut
// pas l'importer statiquement (il finirait dans le graphe d'un Server Component).
async function render(el: React.ReactElement): Promise<string> {
  const { renderToStaticMarkup } = await import("react-dom/server");
  return "<!DOCTYPE html>" + renderToStaticMarkup(el);
}

interface OrderRow {
  id: string;
  order_number: string | null;
  email: string | null;
  full_name: string | null;
  total: number;
  payment_method: "ccp" | "paypal" | "cod" | "transfer" | "chargily" | null;
  customer_id: string | null;
}

async function loadOrder(orderId: string): Promise<OrderRow | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("orders")
    .select("id, order_number, email, full_name, total, payment_method, customer_id")
    .eq("id", orderId)
    .maybeSingle();
  return (data as OrderRow) ?? null;
}

async function loadItems(orderId: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("order_items")
    .select("title, quantity, price, course_id, course:courses(titre_fr)")
    .eq("order_id", orderId);
  return data ?? [];
}

/** Email « commande reçue » + instructions de paiement. */
export async function sendOrderReceived(orderId: string) {
  const order = await loadOrder(orderId);
  if (!order?.email) return { ok: false, error: "Commande/email introuvable." };
  const items = await loadItems(orderId);

  // N° de facture (si déjà générée)
  let invoiceNumber: string | null = null;
  try {
    const admin = createAdminClient();
    const { data: inv } = await admin.from("invoices").select("invoice_number").eq("order_id", orderId).maybeSingle();
    invoiceNumber = inv?.invoice_number ?? null;
  } catch { /* ignore */ }

  const html = await render(createElement(OrderReceivedEmail, {
    customerName: (order.full_name ?? "").split(" ")[0] || "cliente",
    orderNumber: order.order_number ?? "",
    items: items.map((i) => ({ title: i.title, quantity: i.quantity, price: Number(i.price) })),
    total: Number(order.total),
    paymentMethod: order.payment_method ?? "ccp",
    orderUrl: `${SITE}/confirmation/${order.id}`,
    invoiceNumber,
  }));

  return sendEmail({
    userId: order.customer_id, to: order.email, category: "purchases", force: true,
    subject: `Commande ${order.order_number} bien reçue`, html,
  });
}

/**
 * (Re)envoie la facture / le récapitulatif de commande par email au client.
 * Action déclenchée par le bouton « Envoyer ma facture par email » de la page
 * de confirmation. Vérifie que l'appelant est bien propriétaire de la commande.
 */
export async function emailInvoice(orderId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Connectez-vous." };

  const order = await loadOrder(orderId);
  if (!order?.email) return { ok: false, error: "Commande introuvable." };
  if (order.customer_id !== user.id) return { ok: false, error: "Accès refusé." };

  const res = await sendOrderReceived(orderId);
  if (!res?.ok) return { ok: false, error: "Envoi de l'email échoué." };
  return { ok: true, email: order.email };
}

/** Email « paiement approuvé » + lien facture + bouton dashboard. */
export async function sendPaymentApproved(orderId: string, invoiceUrl?: string | null) {
  const order = await loadOrder(orderId);
  if (!order?.email) return { ok: false, error: "Commande/email introuvable." };

  const html = await render(createElement(PaymentApprovedEmail, {
    customerName: (order.full_name ?? "").split(" ")[0] || "cliente",
    orderNumber: order.order_number ?? "",
    invoiceUrl: invoiceUrl ?? null,
    dashboardUrl: `${SITE}/dashboard`,
  }));

  return sendEmail({
    userId: order.customer_id, to: order.email, category: "purchases", force: true,
    subject: "Paiement confirmé ✅", html,
  });
}

/** Email d'accès aux formations achetées (avec magic link « Commencer »). */
export async function sendCourseAccess(orderId: string) {
  const order = await loadOrder(orderId);
  if (!order?.email) return { ok: false, error: "Commande/email introuvable." };
  const items = await loadItems(orderId);

  // Titres des formations uniquement
  const courseTitles = items
    .filter((i) => i.course_id)
    .map((i) => (i.course as { titre_fr?: string } | null)?.titre_fr ?? i.title);
  if (courseTitles.length === 0) return { ok: true, skipped: true as const };

  const magic = await createMagicLink(order.email, `${SITE}/dashboard`);
  const magicLink = magic.ok && magic.link ? magic.link : `${SITE}/dashboard`;

  const html = await render(createElement(CourseAccessEmail, {
    customerName: (order.full_name ?? "").split(" ")[0] || "cliente",
    courseTitles,
    magicLink,
  }));

  return sendEmail({
    userId: order.customer_id, to: order.email, category: "purchases", force: true,
    subject: "Vos formations vous attendent ✨", html,
  });
}

/** Email « votre patron est prêt » + lien de téléchargement (Mes patrons). */
export async function sendPatronAccess(orderId: string) {
  const order = await loadOrder(orderId);
  if (!order?.email) return { ok: false, error: "Commande/email introuvable." };
  const admin = createAdminClient();
  const { data: oi } = await admin.from("order_items").select("product_id").eq("order_id", orderId);
  const pids = (oi ?? []).map((i) => i.product_id).filter((p): p is string => !!p);
  if (pids.length === 0) return { ok: true, skipped: true as const };
  const { data: prods } = await admin
    .from("products").select("patron_id, title").in("id", pids).eq("type", "patron_pdf");
  const patrons = (prods ?? []).filter((p) => p.patron_id);
  if (patrons.length === 0) return { ok: true, skipped: true as const };

  const magic = await createMagicLink(order.email, `${SITE}/dashboard/patrons`);
  const link = magic.ok && magic.link ? magic.link : `${SITE}/dashboard/patrons`;
  const name = (order.full_name ?? "").split(" ")[0] || "cliente";
  const list = patrons.map((p) => `<li style="margin:4px 0">${p.title}</li>`).join("");
  const html = `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;background:#f5f0eb;padding:24px;margin:0">
    <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:18px;padding:28px;border:1px solid #eaded2">
      <h1 style="font-family:Georgia,serif;color:#5B16F9;margin:0 0 8px">Félicitations ${name} 🎉</h1>
      <p style="color:#333;margin:0 0 12px">Voici votre patron, prêt à télécharger :</p>
      <ul style="color:#333;padding-left:18px;margin:0 0 18px">${list}</ul>
      <a href="${link}" style="display:inline-block;background:#FE7223;color:#fff;text-decoration:none;font-weight:700;padding:13px 24px;border-radius:12px">📄 Cliquez pour télécharger</a>
      <p style="color:#888;font-size:13px;margin:18px 0 0">Retrouvez-le aussi dans votre espace « Mes patrons ».</p>
    </div></body></html>`;
  return sendEmail({
    userId: order.customer_id, to: order.email, category: "purchases", force: true,
    subject: "Votre patron est prêt 📄", html,
  });
}

/** Email « preuve refusée » + bouton re-soumettre. */
export async function sendPaymentRejected(orderId: string, reason: string) {
  const order = await loadOrder(orderId);
  if (!order?.email) return { ok: false, error: "Commande/email introuvable." };

  const html = await render(createElement(PaymentRejectedEmail, {
    customerName: (order.full_name ?? "").split(" ")[0] || "cliente",
    orderNumber: order.order_number ?? "",
    reason: reason || "Le justificatif n'a pas pu être validé.",
    resubmitUrl: `${SITE}/dashboard/commandes`,
  }));

  return sendEmail({
    userId: order.customer_id, to: order.email, category: "purchases", force: true,
    subject: "Votre preuve de paiement a été refusée", html,
  });
}

/** Email « nouvelle preuve demandée » avec le message de l'admin. */
export async function sendResubmitRequest(orderId: string, adminNote: string) {
  const order = await loadOrder(orderId);
  if (!order?.email) return { ok: false, error: "Commande/email introuvable." };

  const html = await render(createElement(ResubmitProofEmail, {
    customerName: (order.full_name ?? "").split(" ")[0] || "cliente",
    orderNumber: order.order_number ?? "",
    adminNote: adminNote || "Merci de renvoyer un justificatif plus lisible.",
    resubmitUrl: `${SITE}/dashboard/commandes`,
  }));

  return sendEmail({
    userId: order.customer_id, to: order.email, category: "purchases", force: true,
    subject: "Une nouvelle preuve de paiement est nécessaire", html,
  });
}
