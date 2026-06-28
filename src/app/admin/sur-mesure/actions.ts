"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyUser } from "@/lib/sur-mesure-notify";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, admin: null };
  const { data: prof } = await supabase.from("users").select("role").eq("id", user.id).single();
  if (prof?.role !== "admin") return { ok: false as const, admin: null };
  return { ok: true as const, admin: createAdminClient() };
}

/** L'admin propose un prix pour une commande sur mesure → notifie la cliente. */
export async function proposeCustomPrice(orderId: string, priceDzd: number) {
  if (!z.string().uuid().safeParse(orderId).success) return { ok: false, error: "Commande invalide." };
  const price = Math.round(Number(priceDzd));
  if (!Number.isFinite(price) || price <= 0) return { ok: false, error: "Prix invalide." };
  const { ok, admin } = await requireAdmin();
  if (!ok || !admin) return { ok: false, error: "Accès refusé." };

  const { data: order } = await admin.from("patron_custom_orders").select("id, client_id, titre, statut").eq("id", orderId).maybeSingle();
  if (!order) return { ok: false, error: "Commande introuvable." };
  if (!["price_requested", "price_proposed"].includes(order.statut)) return { ok: false, error: "Cette commande n'est pas en attente de prix." };

  await admin.from("patron_custom_orders").update({ statut: "price_proposed", proposed_price_dzd: price }).eq("id", orderId);
  await notifyUser(admin, order.client_id, {
    title: "💰 Prix proposé pour votre patron sur mesure",
    body: `« ${order.titre} » : ${price.toLocaleString("fr-DZ")} DA. Acceptez ou refusez dans « Sur mesure ».`,
    link: "/dashboard/sur-mesure",
  });
  revalidatePath("/admin/sur-mesure");
  revalidatePath("/dashboard/sur-mesure");
  return { ok: true };
}

/** L'admin approuve la preuve de paiement → débloque le téléchargement du fichier. */
export async function approveCustomPayment(orderId: string) {
  if (!z.string().uuid().safeParse(orderId).success) return { ok: false, error: "Commande invalide." };
  const { ok, admin } = await requireAdmin();
  if (!ok || !admin) return { ok: false, error: "Accès refusé." };

  const { data: order } = await admin.from("patron_custom_orders").select("id, client_id, titre, statut").eq("id", orderId).maybeSingle();
  if (!order) return { ok: false, error: "Commande introuvable." };
  if (order.statut !== "payment_review") return { ok: false, error: "Aucune preuve de paiement à valider." };

  await admin.from("patron_custom_orders").update({ statut: "completed", paid_at: new Date().toISOString() }).eq("id", orderId);
  await notifyUser(admin, order.client_id, {
    title: "✅ Paiement validé — patron disponible",
    body: `« ${order.titre} » : votre paiement est validé, le téléchargement est débloqué.`,
    link: "/dashboard/sur-mesure",
  });
  revalidatePath("/admin/sur-mesure");
  revalidatePath("/dashboard/sur-mesure");
  return { ok: true };
}

/** URL signée pour qu'un média (preuve de paiement OU fichier livré) soit consultable par l'admin. */
export async function getAdminCustomFileUrl(orderId: string, kind: "proof" | "file") {
  if (!z.string().uuid().safeParse(orderId).success) return { ok: false as const, error: "Commande invalide." };
  const { ok, admin } = await requireAdmin();
  if (!ok || !admin) return { ok: false as const, error: "Accès refusé." };
  const { data: order } = await admin.from("patron_custom_orders").select("payment_proof_path, file_path").eq("id", orderId).maybeSingle();
  if (!order) return { ok: false as const, error: "Commande introuvable." };
  const bucket = kind === "proof" ? "proofs" : "custom-patrons";
  const path = kind === "proof" ? order.payment_proof_path : order.file_path;
  if (!path) return { ok: false as const, error: "Fichier absent." };
  const { data, error } = await admin.storage.from(bucket).createSignedUrl(path, 300);
  if (error || !data) return { ok: false as const, error: "Lien indisponible." };
  return { ok: true as const, url: data.signedUrl };
}
