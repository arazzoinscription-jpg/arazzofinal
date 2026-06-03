"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildInvoicePdf, invoiceStoragePath } from "@/lib/invoice-generator";

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

    // Génère le PDF (react-pdf)
    const num = inv.invoice_number ?? inv.id.slice(0, 8);
    const pdf = await buildInvoicePdf({
      invoiceNumber: num,
      orderNumber: order.order_number ?? "",
      date: order.created_at,
      customer: {
        name: order.full_name, email: order.email, address: (order as any).address ?? null,
        city: order.city, wilaya: order.wilaya, country: order.country,
      },
      items: (order.order_items as { title: string; price: number; quantity: number }[]) ?? [],
      subtotal: Number(order.subtotal), discount: Number(order.discount), total: Number(order.total),
    });

    // Upload bucket privé : invoices/{année}/{numéro}.pdf
    storagePath = invoiceStoragePath(num, order.created_at);
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
