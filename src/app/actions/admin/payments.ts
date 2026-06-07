"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { validatePayment } from "../payments";
import { sendPaymentRejected, sendResubmitRequest } from "../emails";

const PROOFS_BUCKET = "proofs";
const SIGNED_TTL = 60 * 60;

/** Garde admin : renvoie le client service-role si l'appelant est admin. */
async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, admin: null, userId: null };
  const { data: prof } = await supabase.from("users").select("role").eq("id", user.id).single();
  if (prof?.role !== "admin") return { ok: false as const, admin: null, userId: null };
  return { ok: true as const, admin: createAdminClient(), userId: user.id };
}

const ReviewSchema = z.object({
  proofId: z.string().uuid(),
  decision: z.enum(["approved", "rejected", "needs_resubmit"]),
  note: z.string().max(2000).optional().nullable(),
});

/**
 * Examine une preuve de paiement CCP.
 *  - approved        → paiement approuvé + validation de la commande (enrôlement…)
 *  - rejected        → paiement rejeté, commande remise en attente de paiement
 *  - needs_resubmit  → l'utilisateur doit renvoyer une preuve
 */
export async function reviewProof(input: z.infer<typeof ReviewSchema>) {
  const parsed = ReviewSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Données invalides." };
  const { ok, admin, userId } = await requireAdmin();
  if (!ok || !admin) return { ok: false, error: "Accès refusé." };

  const { proofId, decision, note } = parsed.data;

  const { data: proof } = await admin
    .from("payment_proofs").select("id, order_id, payment_id, status").eq("id", proofId).maybeSingle();
  if (!proof) return { ok: false, error: "Preuve introuvable." };

  // Mise à jour de la preuve
  await admin.from("payment_proofs").update({
    status: decision, admin_note: note ?? null,
    reviewed_at: new Date().toISOString(), reviewed_by: userId,
  }).eq("id", proofId);

  if (decision === "approved") {
    if (proof.payment_id) {
      await admin.from("order_payments").update({
        status: "approved", verified_at: new Date().toISOString(), verified_by: userId,
      }).eq("id", proof.payment_id);
    }
    // Confirme la commande + enrôlement + facture + emails
    const res = await validatePayment(proof.order_id);
    if (!res.ok) return { ok: false, error: res.error ?? "Validation échouée." };
  } else {
    // Rejet ou demande de renvoi → paiement non validé, commande en attente
    if (proof.payment_id) {
      await admin.from("order_payments").update({
        status: "rejected", rejection_reason: note ?? null,
      }).eq("id", proof.payment_id);
    }
    await admin.from("orders").update({ status: "payment_pending" }).eq("id", proof.order_id);

    // Email au client (best-effort)
    try {
      if (decision === "rejected") await sendPaymentRejected(proof.order_id, note ?? "");
      else await sendResubmitRequest(proof.order_id, note ?? "");
    } catch { /* ignore */ }
  }

  revalidatePath("/admin/paiements");
  return { ok: true };
}

/** Liste les preuves de paiement (filtre optionnel par statut) + URL signée. */
export async function getPaymentProofs(status?: string) {
  const { ok, admin } = await requireAdmin();
  if (!ok || !admin) return { ok: false, error: "Accès refusé.", proofs: [] };

  let query = admin
    .from("payment_proofs")
    .select(`
      id, status, file_url, file_type, file_size, created_at, admin_note,
      extracted_amount, ai_confidence, ai_is_fake,
      order:orders(id, order_number, total, full_name, email, customer_id)
    `)
    .order("created_at", { ascending: false })
    .limit(200);

  const statusParsed = z.enum(["pending", "approved", "rejected", "needs_resubmit"]).safeParse(status);
  if (statusParsed.success) query = query.eq("status", statusParsed.data);

  const { data } = await query;

  // URL signée pour visualiser chaque preuve (bucket privé)
  const proofs = await Promise.all((data ?? []).map(async (p) => {
    let signedUrl: string | null = null;
    if (p.file_url) {
      const { data: s } = await admin.storage.from(PROOFS_BUCKET).createSignedUrl(p.file_url, SIGNED_TTL);
      signedUrl = s?.signedUrl ?? null;
    }
    return { ...p, signedUrl };
  }));

  return { ok: true, proofs };
}

const ORDER_STATUSES = [
  "pending", "payment_pending", "payment_review", "confirmed", "shipped", "delivered", "cancelled", "refunded",
] as const;

/** Change manuellement le statut d'une commande (admin). */
export async function setOrderStatus(orderId: string, status: string) {
  const idOk = z.string().uuid().safeParse(orderId);
  const stOk = z.enum(ORDER_STATUSES).safeParse(status);
  if (!idOk.success) return { ok: false, error: "Commande invalide." };
  if (!stOk.success) return { ok: false, error: "Statut invalide." };

  const { ok, admin } = await requireAdmin();
  if (!ok || !admin) return { ok: false, error: "Accès refusé." };

  const { error } = await admin
    .from("orders")
    .update({ status: stOk.data, updated_at: new Date().toISOString() })
    .eq("id", idOk.data);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/commandes");
  return { ok: true };
}

/** Liste les commandes (filtres : statut, mode de paiement, recherche). */
export async function getOrdersAdmin(filters?: { status?: string; paymentMethod?: string; q?: string }) {
  const { ok, admin } = await requireAdmin();
  if (!ok || !admin) return { ok: false, error: "Accès refusé.", orders: [] };

  let query = admin
    .from("orders")
    .select("id, order_number, status, payment_method, total, full_name, email, created_at, order_items(id)")
    .order("created_at", { ascending: false })
    .limit(200);

  const statusParsed = z.enum([
    "pending", "payment_pending", "payment_review", "confirmed", "shipped", "delivered", "cancelled", "refunded",
  ]).safeParse(filters?.status);
  if (statusParsed.success) query = query.eq("status", statusParsed.data);

  const methodParsed = z.enum(["ccp", "paypal", "cod", "transfer"]).safeParse(filters?.paymentMethod);
  if (methodParsed.success) query = query.eq("payment_method", methodParsed.data);

  const q = (filters?.q ?? "").trim();
  if (q.length >= 2) query = query.or(`order_number.ilike.%${q}%,full_name.ilike.%${q}%,email.ilike.%${q}%`);

  const { data } = await query;
  return { ok: true, orders: data ?? [] };
}
