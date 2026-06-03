"use server";

import { randomUUID } from "crypto";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email";
import { generateInvoice } from "./invoices";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://arazzo-bice.vercel.app";
const MAX_PROOF_SIZE = 10 * 1024 * 1024; // 10 Mo
const PROOFS_BUCKET = "proofs";

// ════════════════════════════════════════════════════════════════════════
// CCP / BaridiMob
// ════════════════════════════════════════════════════════════════════════

/** Configuration CCP active (réservée aux utilisateurs authentifiés). */
export async function getCCPConfig() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Non authentifié." };

  const { data } = await supabase
    .from("ccp_config")
    .select("account_number, account_key, beneficiary_name, qr_code_url")
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (!data) return { ok: false, error: "Aucune configuration CCP disponible." };
  return { ok: true, config: data };
}

/**
 * Soumet une preuve de paiement CCP.
 *  - Validation : JPG/PNG/PDF, max 10 Mo.
 *  - Rate limiting : 3 preuves max par heure et par utilisateur.
 *  - Upload privé proofs/{orderId}/{uuid}, crée payment_proof (pending),
 *    passe la commande en 'payment_review'.
 */
export async function submitCCPProof(orderId: string, file: File, transactionId?: string) {
  const idParsed = z.string().uuid().safeParse(orderId);
  if (!idParsed.success) return { ok: false, error: "Commande invalide." };
  if (!file || file.size === 0) return { ok: false, error: "Fichier requis." };
  if (file.size > MAX_PROOF_SIZE) return { ok: false, error: "Fichier trop lourd (max 10 Mo)." };

  // Type autorisé
  const ext = (file.name.split(".").pop() || "").toLowerCase();
  const fileType =
    file.type === "image/jpeg" || ext === "jpg" || ext === "jpeg" ? "jpg"
    : file.type === "image/png" || ext === "png" ? "png"
    : file.type === "application/pdf" || ext === "pdf" ? "pdf"
    : null;
  if (!fileType) return { ok: false, error: "Format non supporté (JPG, PNG ou PDF uniquement)." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Non authentifié." };

  const admin = createAdminClient();

  // Commande + propriété
  const { data: order } = await admin
    .from("orders").select("id, customer_id, total").eq("id", idParsed.data).maybeSingle();
  if (!order) return { ok: false, error: "Commande introuvable." };
  if (order.customer_id !== user.id) return { ok: false, error: "Accès refusé." };

  // Rate limiting : 3 preuves / heure
  const cutoff = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { data: myOrders } = await admin.from("orders").select("id").eq("customer_id", user.id);
  const myOrderIds = (myOrders ?? []).map((o) => o.id);
  if (myOrderIds.length > 0) {
    const { count } = await admin
      .from("payment_proofs").select("*", { count: "exact", head: true })
      .in("order_id", myOrderIds).gte("created_at", cutoff);
    if ((count ?? 0) >= 3) {
      return { ok: false, error: "Trop de tentatives. Réessayez dans une heure." };
    }
  }

  // Upload bucket privé
  const path = `${order.id}/${randomUUID()}.${ext || fileType}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const { error: upErr } = await admin.storage.from(PROOFS_BUCKET).upload(path, buffer, {
    contentType: file.type || "application/octet-stream", upsert: false,
  });
  if (upErr) return { ok: false, error: "Envoi échoué : " + upErr.message };

  // Paiement (créé ou réutilisé) au statut 'submitted'
  let paymentId: string;
  const { data: existingPay } = await admin
    .from("order_payments").select("id").eq("order_id", order.id).eq("method", "ccp").maybeSingle();
  if (existingPay) {
    paymentId = existingPay.id;
    await admin.from("order_payments")
      .update({ status: "submitted", transaction_id: transactionId ?? null }).eq("id", existingPay.id);
  } else {
    const { data: pay, error: payErr } = await admin
      .from("order_payments")
      .insert({ order_id: order.id, method: "ccp", status: "submitted", amount: order.total, transaction_id: transactionId ?? null })
      .select("id").single();
    if (payErr || !pay) return { ok: false, error: "Création du paiement impossible." };
    paymentId = pay.id;
  }

  // Preuve
  const { error: proofErr } = await admin.from("payment_proofs").insert({
    payment_id: paymentId, order_id: order.id, file_url: path, file_type: fileType,
    file_size: file.size, status: "pending",
  });
  if (proofErr) return { ok: false, error: proofErr.message };

  // Commande en revue
  await admin.from("orders").update({ status: "payment_review" }).eq("id", order.id);

  revalidatePath("/compte/commandes");
  return { ok: true };
}

// ════════════════════════════════════════════════════════════════════════
// PayPal (REST API)
// ════════════════════════════════════════════════════════════════════════

const PAYPAL_BASE = process.env.PAYPAL_API_BASE || "https://api-m.sandbox.paypal.com";
const PAYPAL_CURRENCY = process.env.PAYPAL_CURRENCY || "USD";

async function paypalAccessToken(): Promise<string | null> {
  const id = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_SECRET;
  if (!id || !secret) return null;
  const res = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: "Basic " + Buffer.from(`${id}:${secret}`).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) return null;
  const json = (await res.json()) as { access_token?: string };
  return json.access_token ?? null;
}

interface PayPalOrderResponse {
  id?: string;
  status?: string;
  links?: { href: string; rel: string }[];
  purchase_units?: { payments?: { captures?: { id: string; amount?: { value?: string; currency_code?: string } }[] } }[];
}

/** Crée une commande PayPal et renvoie l'URL d'approbation. */
export async function createPayPalOrder(orderId: string) {
  const parsed = z.string().uuid().safeParse(orderId);
  if (!parsed.success) return { ok: false, error: "Commande invalide." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Non authentifié." };

  const admin = createAdminClient();
  const { data: order } = await admin
    .from("orders").select("id, customer_id, total, order_number").eq("id", parsed.data).maybeSingle();
  if (!order) return { ok: false, error: "Commande introuvable." };
  if (order.customer_id !== user.id) return { ok: false, error: "Accès refusé." };

  const token = await paypalAccessToken();
  if (!token) return { ok: false, error: "PayPal non configuré." };

  const res = await fetch(`${PAYPAL_BASE}/v2/checkout/orders`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [{
        reference_id: order.id,
        amount: { currency_code: PAYPAL_CURRENCY, value: Number(order.total).toFixed(2) },
        custom_id: order.id,
      }],
      application_context: {
        brand_name: "Arazzo",
        return_url: `${SITE}/paiement/paypal/retour?order=${order.id}`,
        cancel_url: `${SITE}/paiement/annule?order=${order.id}`,
      },
    }),
  });

  if (!res.ok) return { ok: false, error: "Création PayPal échouée." };
  const data = (await res.json()) as PayPalOrderResponse;
  const approveUrl = data.links?.find((l) => l.rel === "approve")?.href;
  if (!data.id || !approveUrl) return { ok: false, error: "Réponse PayPal invalide." };

  // Enregistre le paiement en attente
  const { data: existing } = await admin
    .from("order_payments").select("id").eq("order_id", order.id).eq("method", "paypal").maybeSingle();
  if (existing) {
    await admin.from("order_payments").update({ status: "pending", paypal_order_id: data.id }).eq("id", existing.id);
  } else {
    await admin.from("order_payments").insert({
      order_id: order.id, method: "paypal", status: "pending", amount: order.total, paypal_order_id: data.id,
    });
  }
  await admin.from("orders").update({ status: "payment_pending" }).eq("id", order.id);

  return { ok: true, approveUrl, paypalOrderId: data.id };
}

/** Capture un paiement PayPal, vérifie le montant côté serveur, puis valide. */
export async function capturePayPalPayment(paypalOrderId: string, orderId: string) {
  const idParsed = z.string().uuid().safeParse(orderId);
  const ppParsed = z.string().min(3).safeParse(paypalOrderId);
  if (!idParsed.success || !ppParsed.success) return { ok: false, error: "Paramètres invalides." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Non authentifié." };

  const admin = createAdminClient();
  const { data: order } = await admin
    .from("orders").select("id, customer_id, total").eq("id", idParsed.data).maybeSingle();
  if (!order) return { ok: false, error: "Commande introuvable." };
  if (order.customer_id !== user.id) return { ok: false, error: "Accès refusé." };

  const token = await paypalAccessToken();
  if (!token) return { ok: false, error: "PayPal non configuré." };

  const res = await fetch(`${PAYPAL_BASE}/v2/checkout/orders/${ppParsed.data}/capture`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  });
  if (!res.ok) return { ok: false, error: "Capture PayPal échouée." };
  const data = (await res.json()) as PayPalOrderResponse;

  const capture = data.purchase_units?.[0]?.payments?.captures?.[0];
  if (data.status !== "COMPLETED" || !capture) return { ok: false, error: "Paiement non complété." };

  // Vérification du montant CÔTÉ SERVEUR
  const paid = Number(capture.amount?.value ?? "0");
  const expected = Number(order.total);
  if (capture.amount?.currency_code !== PAYPAL_CURRENCY || Math.abs(paid - expected) > 0.01) {
    await admin.from("order_payments")
      .update({ status: "rejected", rejection_reason: "Montant PayPal incohérent" })
      .eq("order_id", order.id).eq("method", "paypal");
    return { ok: false, error: "Montant payé incohérent." };
  }

  await admin.from("order_payments")
    .update({ status: "approved", paypal_capture_id: capture.id, verified_at: new Date().toISOString() })
    .eq("order_id", order.id).eq("method", "paypal");

  await validatePayment(order.id);
  return { ok: true };
}

// ════════════════════════════════════════════════════════════════════════
// Paiement à la livraison (COD)
// ════════════════════════════════════════════════════════════════════════

/** Confirme une commande en paiement à la livraison. */
export async function confirmCODOrder(orderId: string) {
  const parsed = z.string().uuid().safeParse(orderId);
  if (!parsed.success) return { ok: false, error: "Commande invalide." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Non authentifié." };

  const admin = createAdminClient();
  const { data: order } = await admin
    .from("orders").select("id, customer_id, total").eq("id", parsed.data).maybeSingle();
  if (!order) return { ok: false, error: "Commande introuvable." };
  if (order.customer_id !== user.id) return { ok: false, error: "Accès refusé." };

  const { data: existing } = await admin
    .from("order_payments").select("id").eq("order_id", order.id).eq("method", "cod").maybeSingle();
  if (existing) {
    await admin.from("order_payments").update({ status: "approved" }).eq("id", existing.id);
  } else {
    await admin.from("order_payments").insert({
      order_id: order.id, method: "cod", status: "approved", amount: order.total,
    });
  }

  await validatePayment(order.id);
  return { ok: true };
}

// ════════════════════════════════════════════════════════════════════════
// VALIDATION CENTRALE (après tout paiement approuvé)
// ════════════════════════════════════════════════════════════════════════

/**
 * Confirme une commande dont le paiement a été approuvé :
 *  - vérifie qu'un paiement 'approved' existe (sécurité anti-bypass) ;
 *  - passe la commande en 'confirmed', décrémente le stock ;
 *  - crée le compte client si nécessaire ;
 *  - enrôle dans les formations achetées ;
 *  - génère la facture PDF ;
 *  - envoie l'email de confirmation + un magic link.
 * Idempotent : ne retraite pas une commande déjà confirmée.
 */
export async function validatePayment(orderId: string) {
  const parsed = z.string().uuid().safeParse(orderId);
  if (!parsed.success) return { ok: false, error: "Commande invalide." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Non authentifié." };

  const admin = createAdminClient();

  const { data: order } = await admin
    .from("orders")
    .select("id, customer_id, status, email, full_name, total, order_items(product_id, course_id, quantity)")
    .eq("id", parsed.data)
    .maybeSingle();
  if (!order) return { ok: false, error: "Commande introuvable." };

  // Idempotence
  if (["confirmed", "shipped", "delivered"].includes(order.status)) return { ok: true, alreadyDone: true };

  // Sécurité : un paiement approuvé doit exister
  const { data: approved } = await admin
    .from("order_payments").select("id").eq("order_id", order.id).eq("status", "approved").maybeSingle();
  if (!approved) return { ok: false, error: "Aucun paiement approuvé pour cette commande." };

  // 1) Compte client (création si inexistant — checkout invité)
  let customerId = order.customer_id;
  let isNewAccount = false;
  if (!customerId && order.email) {
    const { data: created } = await admin.auth.admin.createUser({
      email: order.email, email_confirm: true,
      user_metadata: { nom: order.full_name ?? order.email.split("@")[0] },
    });
    if (created?.user) {
      customerId = created.user.id;
      isNewAccount = true;
      await admin.from("orders").update({ customer_id: customerId }).eq("id", order.id);
    }
  }

  // 2) Confirmation de la commande
  await admin.from("orders").update({ status: "confirmed" }).eq("id", order.id);

  // 3) Décrément du stock (produits à stock limité)
  const items = (order.order_items as { product_id: string | null; course_id: string | null; quantity: number }[]) ?? [];
  for (const it of items) {
    if (!it.product_id) continue;
    const { data: prod } = await admin.from("products").select("stock").eq("id", it.product_id).maybeSingle();
    if (prod && prod.stock != null) {
      await admin.from("products").update({ stock: Math.max(0, prod.stock - it.quantity) }).eq("id", it.product_id);
    }
  }

  // 4) Enrôlement dans les formations achetées
  if (customerId) {
    for (const it of items) {
      if (!it.course_id) continue;
      const { data: already } = await admin
        .from("enrollments").select("id").eq("user_id", customerId).eq("course_id", it.course_id).maybeSingle();
      if (!already) {
        await admin.from("enrollments").insert({
          user_id: customerId, course_id: it.course_id, order_id: order.id, enrolled_at: new Date().toISOString(),
        });
      }
    }
  }

  // 5) Facture PDF (best-effort)
  let invoiceUrl: string | null = null;
  try {
    const inv = await generateInvoice(order.id);
    if (inv.ok && inv.url) invoiceUrl = inv.url;
  } catch { /* la facture pourra être régénérée plus tard */ }

  // 6) Magic link + email de confirmation
  if (order.email) {
    let magicLink: string | null = null;
    try {
      const { data: link } = await admin.auth.admin.generateLink({
        type: "magiclink", email: order.email,
      });
      magicLink = link?.properties?.action_link ?? null;
    } catch { /* ignore */ }

    const prenom = (order.full_name ?? "").split(" ")[0] || "Bonjour";
    const html = `
      <div style="font-family:Arial,sans-serif;color:#333;">
        <h2 style="color:#4B3BC7;">Merci ${prenom} ! 🎉</h2>
        <p>Votre commande est <strong>confirmée</strong>. Total : <strong>${Number(order.total).toLocaleString("fr-DZ")} DA</strong>.</p>
        ${isNewAccount ? "<p>Un compte a été créé pour vous afin d'accéder à vos achats.</p>" : ""}
        ${invoiceUrl ? `<p><a href="${invoiceUrl}" style="color:#E07840;">📄 Télécharger votre facture</a></p>` : ""}
        ${magicLink ? `<p><a href="${magicLink}" style="background:#4B3BC7;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;">Accéder à mon espace</a></p>` : `<p><a href="${SITE}/dashboard">Accéder à mon espace</a></p>`}
      </div>`;

    await sendEmail({
      userId: customerId ?? null, to: order.email, category: "purchases", force: true,
      subject: "Votre commande Arazzo est confirmée ✅", html,
    });
  }

  revalidatePath("/compte/commandes");
  return { ok: true };
}
