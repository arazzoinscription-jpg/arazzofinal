"use server";

import { randomUUID } from "crypto";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateInvoice } from "./invoices";
import { enrollAfterPayment } from "@/lib/enrollment";
import { advanceSubscriptionForOrder } from "@/lib/subscriptions";
import { advancePackSubscriptionForOrder } from "@/lib/pack-subscriptions";
import { sendPaymentApproved, sendCourseAccess, sendPatronAccess } from "./emails";
import { createChargilyCheckout } from "@/lib/chargily";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://www.formation-arazzo.store";
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

/**
 * Crée une URL d'upload SIGNÉE pour déposer une preuve directement depuis le
 * navigateur vers Supabase Storage (bucket privé 'proofs').
 * ➜ Évite la limite de 4,5 Mo des fonctions serverless Vercel : le fichier ne
 *   transite jamais par notre serveur, seulement par Supabase.
 * Le chemin est imposé côté serveur : {orderId}/{uuid}.ext (commande de l'utilisateur).
 */
export async function createProofUploadUrl(orderId: string, ext: string) {
  const idParsed = z.string().uuid().safeParse(orderId);
  if (!idParsed.success) return { ok: false as const, error: "Commande invalide." };

  const cleanExt = (ext || "").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5);
  if (!["jpg", "jpeg", "png", "pdf"].includes(cleanExt)) {
    return { ok: false as const, error: "Format non supporté (JPG, PNG ou PDF uniquement)." };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Non authentifié." };

  const admin = createAdminClient();
  const { data: order } = await admin
    .from("orders").select("id, customer_id").eq("id", idParsed.data).maybeSingle();
  if (!order) return { ok: false as const, error: "Commande introuvable." };
  if (order.customer_id !== user.id) return { ok: false as const, error: "Accès refusé." };

  const path = `${order.id}/${randomUUID()}.${cleanExt}`;
  const { data, error } = await admin.storage.from(PROOFS_BUCKET).createSignedUploadUrl(path);
  if (error || !data) return { ok: false as const, error: "Préparation de l'envoi impossible." };

  return { ok: true as const, path: data.path, token: data.token };
}

/**
 * Enregistre une preuve DÉJÀ uploadée (via URL signée) : crée le paiement +
 * la preuve (statut pending) et passe la commande en 'payment_review'.
 */
export async function recordCCPProof(
  orderId: string, path: string, fileType: string, fileSize: number, transactionId?: string,
) {
  const idParsed = z.string().uuid().safeParse(orderId);
  if (!idParsed.success) return { ok: false, error: "Commande invalide." };
  const ftParsed = z.enum(["jpg", "png", "pdf"]).safeParse(fileType);
  if (!ftParsed.success) return { ok: false, error: "Format non supporté." };
  if (typeof path !== "string" || !path.startsWith(idParsed.data + "/")) {
    return { ok: false, error: "Chemin de fichier invalide." };
  }
  if (fileSize > MAX_PROOF_SIZE) return { ok: false, error: "Fichier trop lourd (max 10 Mo)." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Non authentifié." };

  const admin = createAdminClient();
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
    if ((count ?? 0) >= 3) return { ok: false, error: "Trop de tentatives. Réessayez dans une heure." };
  }

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

  const { error: proofErr } = await admin.from("payment_proofs").insert({
    payment_id: paymentId, order_id: order.id, file_url: path, file_type: ftParsed.data,
    file_size: fileSize, status: "pending",
  });
  if (proofErr) return { ok: false, error: proofErr.message };

  await admin.from("orders").update({ status: "payment_review" }).eq("id", order.id);

  revalidatePath("/compte/commandes");
  revalidatePath("/dashboard/commandes");
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
// Chargily Pay (DZD — paiement en ligne par carte / Edahabia / CIB)
// ════════════════════════════════════════════════════════════════════════

/**
 * Crée un checkout Chargily pour une commande et renvoie l'URL de paiement
 * hébergée. La confirmation se fait via le webhook `/api/webhooks/chargily`
 * (metadata `order_id`), qui appelle `finalizeOrderConfirmation`.
 */
export async function createChargilyOrder(orderId: string) {
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

  if (!process.env.CHARGILY_API_KEY) return { ok: false, error: "Paiement en ligne non configuré." };

  let checkout: { id: string; checkout_url: string };
  try {
    checkout = await createChargilyCheckout({
      amount: Math.round(Number(order.total)),
      currency: "dzd",
      description: `Commande ${order.order_number ?? order.id}`,
      webhookEndpoint: `${SITE}/api/webhooks/chargily`,
      backUrl: `${SITE}/confirmation/${order.id}`,
      metadata: { order_id: order.id },
    });
  } catch {
    return { ok: false, error: "Service de paiement indisponible. Réessayez plus tard." };
  }

  // Paiement en attente (créé ou réutilisé)
  const { data: existing } = await admin
    .from("order_payments").select("id").eq("order_id", order.id).eq("method", "chargily").maybeSingle();
  if (existing) {
    await admin.from("order_payments").update({ status: "pending", transaction_id: checkout.id }).eq("id", existing.id);
  } else {
    await admin.from("order_payments").insert({
      order_id: order.id, method: "chargily", status: "pending", amount: order.total, transaction_id: checkout.id,
    });
  }
  await admin.from("orders").update({ status: "payment_pending" }).eq("id", order.id);

  return { ok: true, checkoutUrl: checkout.checkout_url };
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

  return finalizeOrderConfirmation(parsed.data);
}

/**
 * Cœur de confirmation de commande — **admin, sans session utilisateur**.
 * Appelé par `validatePayment` (côté client, après vérif user) ET par les
 * webhooks de paiement (server-to-server, signature déjà vérifiée).
 * Exige qu'un `order_payments.status = 'approved'` existe (anti-bypass).
 * Idempotent.
 */
export async function finalizeOrderConfirmation(orderId: string) {
  const parsed = z.string().uuid().safeParse(orderId);
  if (!parsed.success) return { ok: false, error: "Commande invalide." };

  const admin = createAdminClient();

  const { data: order } = await admin
    .from("orders")
    .select("id, customer_id, status, email, full_name, total, installment_month, subscription_id, order_items(product_id, course_id, quantity)")
    .eq("id", parsed.data)
    .maybeSingle();
  if (!order) return { ok: false, error: "Commande introuvable." };

  // Idempotence
  if (["confirmed", "shipped", "delivered"].includes(order.status)) return { ok: true, alreadyDone: true };

  // Sécurité : un paiement approuvé doit exister
  const { data: approved } = await admin
    .from("order_payments").select("id").eq("order_id", order.id).eq("status", "approved").maybeSingle();
  if (!approved) return { ok: false, error: "Aucun paiement approuvé pour cette commande." };

  // 1) Confirmation de la commande
  await admin.from("orders").update({ status: "confirmed" }).eq("id", order.id);

  // 2) Décrément du stock (produits à stock limité)
  const items = (order.order_items as { product_id: string | null; course_id: string | null; quantity: number }[]) ?? [];
  for (const it of items) {
    if (!it.product_id) continue;
    const { data: prod } = await admin.from("products").select("stock").eq("id", it.product_id).maybeSingle();
    if (prod && prod.stock != null) {
      await admin.from("products").update({ stock: Math.max(0, prod.stock - it.quantity) }).eq("id", it.product_id);
    }
  }

  // 3) Compte + profil + enrôlement (centralisés dans enrollAfterPayment)
  const enr = await enrollAfterPayment(order.id);
  const targetUserId = enr.userId ?? order.customer_id;
  const enrolledCount = enr.enrolled?.length ?? 0;

  // 3 bis) Abonnement par tranches : avance le palier (création à la 1ʳᵉ échéance).
  const subCourseId = items.find((it) => it.course_id)?.course_id ?? null;
  if (targetUserId && subCourseId && (order as { installment_month?: number | null }).installment_month != null) {
    try {
      await advanceSubscriptionForOrder(admin, {
        orderId: order.id,
        userId: targetUserId,
        courseId: subCourseId,
        orderTotal: Number(order.total) || 0,
        installmentMonth: (order as { installment_month?: number | null }).installment_month ?? null,
        subscriptionId: (order as { subscription_id?: string | null }).subscription_id ?? null,
      });
    } catch { /* l'échec d'avancement ne doit pas bloquer la validation */ }
  }

  // 3 ter) Abonnement PACK par tranches : lecture résiliente de pack_id/pack_subscription_id
  // (colonnes migration 047) via une requête séparée → ne casse pas le flux si non appliquée.
  if (targetUserId && (order as { installment_month?: number | null }).installment_month != null) {
    try {
      const { data: po } = await admin.from("orders").select("pack_id, pack_subscription_id").eq("id", order.id).maybeSingle();
      const packId = (po as { pack_id?: string | null } | null)?.pack_id ?? null;
      if (packId) {
        await advancePackSubscriptionForOrder(admin, {
          orderId: order.id,
          userId: targetUserId,
          packId,
          orderTotal: Number(order.total) || 0,
          installmentMonth: (order as { installment_month?: number | null }).installment_month ?? null,
          packSubscriptionId: (po as { pack_subscription_id?: string | null } | null)?.pack_subscription_id ?? null,
        });
      }
    } catch { /* migration 047 non appliquée ou erreur → ignore */ }
  }

  // 4) Facture PDF (best-effort)
  let invoiceUrl: string | null = null;
  try {
    const inv = await generateInvoice(order.id);
    if (inv.ok && inv.url) invoiceUrl = inv.url;
  } catch { /* la facture pourra être régénérée plus tard */ }

  // 5) Emails : confirmation de paiement + accès aux formations (magic link)
  try {
    await sendPaymentApproved(order.id, invoiceUrl);
    await sendCourseAccess(order.id); // ignoré automatiquement s'il n'y a aucune formation
    await sendPatronAccess(order.id); // email + lien si la commande contient un patron PDF
  } catch { /* l'échec d'un email ne doit pas bloquer la validation */ }

  // 6) Notification dashboard pour l'élève
  if (targetUserId) {
    try {
      await admin.from("notifications").insert({
        user_id: targetUserId,
        type: "system",
        title: "✅ Commande confirmée",
        body: enrolledCount > 0
          ? "Votre paiement est validé — vos formations sont maintenant accessibles dans votre espace."
          : "Votre paiement a été validé. Merci pour votre commande !",
        link: enrolledCount > 0 ? "/dashboard" : "/dashboard/commandes",
      });
    } catch { /* ignore */ }
  }

  revalidatePath("/compte/commandes");
  revalidatePath("/dashboard/commandes");
  revalidatePath("/dashboard");
  return { ok: true };
}
