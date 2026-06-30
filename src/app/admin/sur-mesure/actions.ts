"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyUser } from "@/lib/sur-mesure-notify";
import { sendEmail } from "@/lib/email";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, admin: null };
  const { data: prof } = await supabase.from("users").select("role").eq("id", user.id).single();
  if (prof?.role !== "admin") return { ok: false as const, admin: null };
  return { ok: true as const, admin: createAdminClient() };
}

/**
 * L'admin propose un prix → notifie la cliente (in-app + email).
 * Pour un PLACEMENT patron (mesures.kind === "placement_patron"), l'admin saisit
 * DEUX prix : `priceDzd` = PDF (prix principal), `paperPriceDzd` = papier imprimé.
 * Le prix papier est conservé dans le JSON `mesures` (pas de colonne dédiée).
 */
export async function proposeCustomPrice(orderId: string, priceDzd: number, paperPriceDzd?: number) {
  if (!z.string().uuid().safeParse(orderId).success) return { ok: false, error: "Commande invalide." };
  const price = Math.round(Number(priceDzd));
  if (!Number.isFinite(price) || price <= 0) return { ok: false, error: "Prix invalide." };
  const { ok, admin } = await requireAdmin();
  if (!ok || !admin) return { ok: false, error: "Accès refusé." };

  const { data: order } = await admin
    .from("patron_custom_orders")
    .select("id, client_id, titre, statut, mesures, client:users!patron_custom_orders_client_id_fkey(email)")
    .eq("id", orderId).maybeSingle();
  if (!order) return { ok: false, error: "Commande introuvable." };
  if (!["price_requested", "price_proposed"].includes(order.statut)) return { ok: false, error: "Cette commande n'est pas en attente de prix." };

  const mesures = (order.mesures ?? {}) as Record<string, unknown>;
  const isPlacementPatron = mesures.kind === "placement_patron";

  const update: Record<string, unknown> = { statut: "price_proposed", proposed_price_dzd: price };
  let priceLine = `${price.toLocaleString("fr-DZ")} DA`;
  if (isPlacementPatron) {
    const paper = Math.round(Number(paperPriceDzd));
    if (!Number.isFinite(paper) || paper <= 0) return { ok: false, error: "Indiquez aussi le prix papier imprimé." };
    update.mesures = { ...mesures, prix_pdf_dzd: price, prix_papier_dzd: paper };
    priceLine = `PDF ${price.toLocaleString("fr-DZ")} DA · Papier imprimé ${paper.toLocaleString("fr-DZ")} DA`;
  }

  await admin.from("patron_custom_orders").update(update).eq("id", orderId);

  await notifyUser(admin, order.client_id, {
    title: isPlacementPatron ? "💰 Devis de placement prêt" : "💰 Prix proposé pour votre patron sur mesure",
    body: `« ${order.titre} » : ${priceLine}. Acceptez et choisissez le format dans « Sur mesure ».`,
    link: "/dashboard/sur-mesure",
  });

  const clientEmail = (order.client as { email?: string } | null)?.email;
  if (clientEmail) {
    await sendEmail({
      to: clientEmail, userId: order.client_id, category: "purchases", force: true,
      subject: isPlacementPatron ? "Votre devis de placement Arazzo est prêt" : "Votre devis sur mesure Arazzo est prêt",
      html: `<div style="font-family:system-ui,Arial,sans-serif;max-width:520px;color:#111827">
        <h2 style="color:#5B16F9;margin:0 0 8px">Votre devis est prêt 💜</h2>
        <p style="margin:0 0 6px">Commande : <strong>${order.titre}</strong></p>
        <p style="margin:0 0 14px;font-size:18px;color:#FE7223;font-weight:700">${priceLine}</p>
        <p style="margin:0 0 14px">Connectez-vous à votre espace « Sur mesure » pour <strong>accepter</strong>${isPlacementPatron ? " et choisir le format (PDF ou papier imprimé)" : ""}, ou refuser.</p>
        <p><a href="${process.env.NEXT_PUBLIC_SITE_URL || "https://www.formation-arazzo.store"}/dashboard/sur-mesure" style="display:inline-block;background:#FE7223;color:#fff;text-decoration:none;font-weight:700;padding:10px 18px;border-radius:10px">Voir mon devis</a></p>
      </div>`,
    });
  }

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
