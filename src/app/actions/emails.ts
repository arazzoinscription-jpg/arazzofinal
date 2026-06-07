"use server";

import { createElement } from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email";
import { createMagicLink } from "@/lib/magic-link";
import { OrderReceivedEmail } from "@/emails/order-received";
import { PaymentApprovedEmail } from "@/emails/payment-approved";
import { CourseAccessEmail } from "@/emails/course-access";
import { PaymentRejectedEmail } from "@/emails/payment-rejected";
import { ResubmitProofEmail } from "@/emails/resubmit-proof";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://arazzo-bice.vercel.app";

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
  payment_method: "ccp" | "paypal" | "cod" | "transfer" | null;
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
