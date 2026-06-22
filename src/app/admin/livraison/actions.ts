"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { enrollAfterPayment } from "@/lib/enrollment";
import { createAccessLink } from "@/lib/access-link";
import { sendEmail } from "@/lib/email";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, admin: null };
  const { data: prof } = await supabase.from("users").select("role").eq("id", user.id).single();
  return { ok: prof?.role === "admin", admin: createAdminClient() };
}

/**
 * Confirme le paiement à la livraison d'une commande COD :
 *  1) enrôle l'élève (crée le compte si besoin) → accès débloqué ;
 *  2) passe la commande en « confirmed » ;
 *  3) génère un lien magique d'accès direct + l'envoie par email ;
 *  4) renvoie le lien (pour QR / impression de la fiche).
 */
export async function confirmDeliveryAccess(orderId: string) {
  const { ok, admin } = await requireAdmin();
  if (!ok || !admin) return { ok: false as const, error: "Accès refusé." };

  const { data: order } = await admin
    .from("orders").select("id, email, full_name, payment_method").eq("id", orderId).maybeSingle();
  if (!order) return { ok: false as const, error: "Commande introuvable." };
  if (order.payment_method !== "cod") return { ok: false as const, error: "Commande non « paiement à la livraison »." };
  if (!order.email) return { ok: false as const, error: "Email manquant sur la commande." };

  const enr = await enrollAfterPayment(orderId);
  if (!enr.ok || !enr.userId) return { ok: false as const, error: enr.error ?? "Enrôlement impossible." };

  await admin.from("orders").update({ status: "confirmed" }).eq("id", orderId);

  const al = await createAccessLink(enr.userId);
  const link = al.ok ? al.url : null;

  if (link) {
    const html = `
      <h2 style="font-family:Georgia,serif;color:#1b0c3c;margin:0 0 8px">Votre accès est prêt 🎉</h2>
      <p style="color:#4b5563">Bonjour ${order.full_name ?? ""}, votre paiement a bien été reçu. Cliquez pour accéder directement à votre formation :</p>
      <div style="text-align:center;margin:24px 0">
        <a href="${link}" style="display:inline-block;background:#E07840;color:#fff;padding:14px 30px;border-radius:12px;text-decoration:none;font-weight:bold">Accéder à ma formation</a>
      </div>
      <p style="color:#9ca3af;font-size:13px">Ce lien vous connecte directement. Vous pourrez définir un mot de passe depuis votre espace.</p>`;
    try { await sendEmail({ to: order.email, category: "welcome", force: true, subject: "🎉 Votre accès Arazzo Formation est prêt", html }); } catch { /* best-effort */ }
  }

  revalidatePath("/admin/livraison");
  return { ok: true as const, link };
}

/** (Re)génère un lien d'accès branché (48h) pour une commande confirmée (QR / impression). */
export async function regenerateAccessLink(orderId: string) {
  const { ok, admin } = await requireAdmin();
  if (!ok || !admin) return { ok: false as const, error: "Accès refusé." };
  const { data: order } = await admin.from("orders").select("customer_id, email").eq("id", orderId).maybeSingle();
  if (!order) return { ok: false as const, error: "Commande introuvable." };
  let userId = order.customer_id as string | null;
  if (!userId && order.email) {
    const { data: u } = await admin.from("users").select("id").eq("email", order.email).maybeSingle();
    userId = u?.id ?? null;
  }
  if (!userId) return { ok: false as const, error: "Compte élève introuvable (confirmez d'abord le paiement)." };
  const al = await createAccessLink(userId);
  return al.ok ? { ok: true as const, link: al.url } : { ok: false as const, error: al.error ?? "Erreur." };
}
