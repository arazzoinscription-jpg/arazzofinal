"use server";

import { z } from "zod";
import jsPDF from "jspdf";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const BUCKET = "invoices";
const SIGNED_TTL = 60 * 60; // 1 h

/**
 * Génère (ou récupère) la facture PDF d'une commande confirmée.
 * Idempotent : une seule facture par commande.
 * Accessible au propriétaire de la commande ou à un admin.
 * Renvoie une URL signée temporaire vers le PDF.
 */
export async function generateInvoice(orderId: string) {
  const parsed = z.string().uuid().safeParse(orderId);
  if (!parsed.success) return { ok: false, error: "Commande invalide." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Non authentifié." };

  const admin = createAdminClient();

  // Commande + lignes + client
  const { data: order } = await admin
    .from("orders")
    .select(`
      id, order_number, customer_id, full_name, email, address, city, wilaya, country,
      subtotal, discount, total, created_at,
      order_items(title, price, quantity)
    `)
    .eq("id", parsed.data)
    .maybeSingle();
  if (!order) return { ok: false, error: "Commande introuvable." };

  // Autorisation : propriétaire ou admin
  const { data: prof } = await admin.from("users").select("role").eq("id", user.id).single();
  const isAdmin = prof?.role === "admin";
  if (order.customer_id !== user.id && !isAdmin) return { ok: false, error: "Accès refusé." };

  // Facture déjà existante → on renvoie son URL signée
  const { data: existing } = await admin
    .from("invoices").select("id, invoice_number, pdf_url").eq("order_id", order.id).maybeSingle();

  let invoiceId = existing?.id;
  let invoiceNumber = existing?.invoice_number ?? null;
  let storagePath = existing?.pdf_url ?? null;

  if (!existing) {
    // Crée la ligne facture (invoice_number rempli par trigger)
    const { data: inv, error: invErr } = await admin
      .from("invoices")
      .insert({ order_id: order.id, customer_id: order.customer_id, amount: order.total })
      .select("id, invoice_number")
      .single();
    if (invErr || !inv) return { ok: false, error: invErr?.message ?? "Création de facture impossible." };
    invoiceId = inv.id;
    invoiceNumber = inv.invoice_number;

    // Génère le PDF
    const pdf = buildInvoicePdf({
      number: inv.invoice_number ?? inv.id.slice(0, 8),
      orderNumber: order.order_number ?? "",
      date: order.created_at,
      customer: { name: order.full_name, email: order.email, city: order.city, wilaya: order.wilaya, country: order.country },
      items: (order.order_items as { title: string; price: number; quantity: number }[]) ?? [],
      subtotal: Number(order.subtotal), discount: Number(order.discount), total: Number(order.total),
    });

    // Upload bucket privé
    storagePath = `${order.id}/${inv.id}.pdf`;
    const { error: upErr } = await admin.storage.from(BUCKET).upload(storagePath, pdf, {
      contentType: "application/pdf", upsert: true,
    });
    if (upErr) return { ok: false, error: "Upload du PDF échoué : " + upErr.message };

    await admin.from("invoices").update({ pdf_url: storagePath }).eq("id", inv.id);
  }

  // URL signée temporaire
  const { data: signed } = await admin.storage.from(BUCKET).createSignedUrl(storagePath!, SIGNED_TTL);
  return { ok: true, url: signed?.signedUrl ?? null, invoiceId, invoiceNumber };
}

/** Renvoie une URL signée de la facture après contrôle de propriété. */
export async function downloadInvoice(invoiceId: string) {
  const parsed = z.string().uuid().safeParse(invoiceId);
  if (!parsed.success) return { ok: false, error: "Facture invalide." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Non authentifié." };

  const admin = createAdminClient();
  const { data: invoice } = await admin
    .from("invoices").select("id, customer_id, pdf_url").eq("id", parsed.data).maybeSingle();
  if (!invoice || !invoice.pdf_url) return { ok: false, error: "Facture introuvable." };

  const { data: prof } = await admin.from("users").select("role").eq("id", user.id).single();
  const isAdmin = prof?.role === "admin";
  if (invoice.customer_id !== user.id && !isAdmin) return { ok: false, error: "Accès refusé." };

  const { data: signed } = await admin.storage.from(BUCKET).createSignedUrl(invoice.pdf_url, SIGNED_TTL);
  if (!signed?.signedUrl) return { ok: false, error: "Lien indisponible." };
  return { ok: true, url: signed.signedUrl };
}

// ── Construction du PDF (jsPDF) ──────────────────────────────────────────
interface InvoiceData {
  number: string;
  orderNumber: string;
  date: string;
  customer: { name: string | null; email: string | null; city: string | null; wilaya: string | null; country: string | null };
  items: { title: string; price: number; quantity: number }[];
  subtotal: number;
  discount: number;
  total: number;
}

function buildInvoicePdf(d: InvoiceData): Buffer {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = 210;
  const fmt = (n: number) => `${Number(n).toLocaleString("fr-DZ")} DA`;

  // En-tête
  doc.setFillColor(75, 59, 199); doc.rect(0, 0, W, 36, "F");
  doc.setTextColor(255, 255, 255); doc.setFont("times", "bold"); doc.setFontSize(22);
  doc.text("ARAZZO", 20, 20);
  doc.setFontSize(11); doc.setFont("times", "normal"); doc.text("Facture", 20, 28);

  // Méta
  doc.setTextColor(60, 60, 60); doc.setFontSize(11);
  doc.text(`Facture N° : ${d.number}`, 20, 50);
  doc.text(`Commande : ${d.orderNumber}`, 20, 57);
  doc.text(`Date : ${new Date(d.date).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}`, 20, 64);

  // Client
  doc.setFont("times", "bold"); doc.text("Facturé à :", 130, 50);
  doc.setFont("times", "normal");
  doc.text(d.customer.name ?? "—", 130, 57);
  if (d.customer.email) doc.text(d.customer.email, 130, 63);
  const loc = [d.customer.city, d.customer.wilaya, d.customer.country].filter(Boolean).join(", ");
  if (loc) doc.text(loc, 130, 69);

  // Tableau
  let y = 90;
  doc.setFillColor(245, 240, 235); doc.rect(20, y - 7, 170, 10, "F");
  doc.setFont("times", "bold"); doc.setFontSize(10);
  doc.text("Article", 24, y); doc.text("Qté", 135, y); doc.text("Prix", 165, y);
  doc.setFont("times", "normal");
  y += 10;
  for (const it of d.items) {
    doc.text(String(it.title).slice(0, 60), 24, y);
    doc.text(String(it.quantity), 137, y);
    doc.text(fmt(it.price * it.quantity), 165, y);
    y += 8;
    if (y > 250) { doc.addPage(); y = 30; }
  }

  // Totaux
  y += 4;
  doc.setDrawColor(200, 200, 200); doc.line(120, y, 190, y); y += 8;
  doc.text("Sous-total", 130, y); doc.text(fmt(d.subtotal), 165, y); y += 7;
  if (d.discount > 0) { doc.text("Remise", 130, y); doc.text(`- ${fmt(d.discount)}`, 165, y); y += 7; }
  doc.setFont("times", "bold"); doc.setFontSize(13); doc.setTextColor(224, 120, 64);
  doc.text("TOTAL", 130, y); doc.text(fmt(d.total), 165, y);

  // Pied
  doc.setTextColor(150, 150, 150); doc.setFont("times", "normal"); doc.setFontSize(9);
  doc.text("Merci pour votre achat sur Arazzo.", 20, 272);
  doc.setFillColor(224, 120, 64); doc.rect(0, 287, W, 10, "F");

  return Buffer.from(doc.output("arraybuffer"));
}
