"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyPatronnistes, notifyUser, notifyAdmins } from "@/lib/sur-mesure-notify";
import { z } from "zod";
import { createBunnyVideo, bunnyTusAuth, isBunnyConfigured, FEED_LIBRARY_ID } from "@/lib/bunny/stream";
import { MESURE_FIELDS } from "./constants";

/**
 * Démarre l'upload de la vidéo du modèle vers Bunny Stream (TUS résumable côté
 * navigateur — le fichier ne transite pas par notre serveur, donc pas de limite 4,5 Mo).
 * Accessible à toute cliente connectée qui passe une commande sur mesure.
 */
export async function startSurMesureVideo(title: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Veuillez vous connecter." };
  if (!isBunnyConfigured()) return { ok: false as const, error: "Service vidéo non configuré." };
  const created = await createBunnyVideo(title?.slice(0, 120) || "Modèle sur mesure");
  if (!created.ok) return { ok: false as const, error: created.error };
  const tus = bunnyTusAuth(created.videoId);
  const embedUrl = `https://iframe.mediadelivery.net/embed/${FEED_LIBRARY_ID}/${created.videoId}`;
  return { ok: true as const, videoId: created.videoId, embedUrl, tus };
}

export async function placeCustomOrder(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Veuillez vous connecter." };

  const titre = String(formData.get("titre") || "").trim();
  if (!titre) return { ok: false, error: "Décrivez le modèle souhaité." };

  const tissu = String(formData.get("tissu") || "").trim() || null;
  const taille = String(formData.get("taille") || "").trim() || null;
  const note = String(formData.get("note") || "").trim() || null;
  const photo_url = String(formData.get("photo_url") || "").trim() || null;
  const video_url = String(formData.get("video_url") || "").trim() || null;

  const mesures: Record<string, number> = {};
  for (const f of MESURE_FIELDS) {
    const v = formData.get(`m_${f}`);
    if (v != null && String(v).trim() !== "") {
      const n = Number(v);
      if (Number.isFinite(n) && n > 0) mesures[f] = n;
    }
  }

  const admin = createAdminClient();
  const { data: order, error } = await admin.from("patron_custom_orders").insert({
    client_id: user.id,
    titre,
    tissu,
    taille,
    note,
    mesures,
    photo_url,
    video_url,
    statut: "price_requested", // 1ʳᵉ étape : l'admin doit proposer un prix
  }).select("id").single();
  if (error) return { ok: false, error: error.message };

  // Étape 1 : la demande part vers l'ADMIN (proposition de prix), pas encore aux patronnistes.
  await notifyAdmins(admin, {
    title: "💬 Demande de prix sur mesure",
    body: `« ${titre} » — une cliente attend une proposition de prix.`,
    link: "/admin/sur-mesure",
  });

  revalidatePath("/dashboard/sur-mesure");
  revalidatePath("/admin/sur-mesure");
  return { ok: true };
}

const guardClient = async (orderId: string) => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { user: null, admin: null, order: null };
  const admin = createAdminClient();
  const { data: order } = await admin
    .from("patron_custom_orders")
    .select("id, client_id, titre, statut, proposed_price_dzd, file_path")
    .eq("id", orderId)
    .maybeSingle();
  if (!order || order.client_id !== user.id) return { user, admin, order: null };
  return { user, admin, order };
};

/** Le client ACCEPTE le prix proposé → la commande est diffusée aux patronnistes. */
export async function acceptCustomPrice(orderId: string) {
  if (!z.string().uuid().safeParse(orderId).success) return { ok: false, error: "Commande invalide." };
  const { admin, order } = await guardClient(orderId);
  if (!admin || !order) return { ok: false, error: "Commande introuvable." };
  if (order.statut !== "price_proposed") return { ok: false, error: "Cette commande n'attend pas votre accord." };

  await admin.from("patron_custom_orders").update({ statut: "awaiting_patronniste" }).eq("id", orderId);
  await notifyPatronnistes(admin, {
    title: "🧵 Nouvelle commande sur mesure disponible",
    body: `« ${order.titre} » — ${Number(order.proposed_price_dzd ?? 0).toLocaleString("fr-DZ")} DA. Première patronniste à l'accepter la prend.`,
  });
  revalidatePath("/dashboard/sur-mesure");
  revalidatePath("/patronniste/sur-mesure");
  return { ok: true };
}

/** Le client REFUSE le prix proposé → commande clôturée. */
export async function refuseCustomPrice(orderId: string) {
  if (!z.string().uuid().safeParse(orderId).success) return { ok: false, error: "Commande invalide." };
  const { admin, order } = await guardClient(orderId);
  if (!admin || !order) return { ok: false, error: "Commande introuvable." };
  if (order.statut !== "price_proposed") return { ok: false, error: "Action impossible." };

  await admin.from("patron_custom_orders").update({ statut: "refused" }).eq("id", orderId);
  await notifyAdmins(admin, { title: "Prix refusé", body: `La cliente a refusé le prix de « ${order.titre} ».`, link: "/admin/sur-mesure" });
  revalidatePath("/dashboard/sur-mesure");
  return { ok: true };
}

/**
 * Étape paiement : prépare une URL d'upload signée pour la preuve de paiement
 * (bucket privé `proofs`). Le client n'upload qu'au moment de télécharger.
 */
export async function createCustomPaymentUploadUrl(orderId: string, ext: string) {
  if (!z.string().uuid().safeParse(orderId).success) return { ok: false as const, error: "Commande invalide." };
  const cleanExt = (ext || "").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5);
  if (!["jpg", "jpeg", "png", "pdf"].includes(cleanExt)) return { ok: false as const, error: "Format non supporté (JPG, PNG, PDF)." };
  const { admin, order } = await guardClient(orderId);
  if (!admin || !order) return { ok: false as const, error: "Commande introuvable." };
  if (order.statut !== "delivered" && order.statut !== "payment_review") return { ok: false as const, error: "Le fichier n'est pas encore prêt." };

  const { randomUUID } = await import("crypto");
  const path = `sur-mesure/${orderId}/${randomUUID()}.${cleanExt}`;
  const { data, error } = await admin.storage.from("proofs").createSignedUploadUrl(path);
  if (error || !data) return { ok: false as const, error: "Préparation de l'envoi impossible." };
  return { ok: true as const, path: data.path, token: data.token };
}

/** Le client enregistre sa preuve de paiement → en attente de validation admin. */
export async function submitCustomPayment(orderId: string, proofPath: string) {
  if (!z.string().uuid().safeParse(orderId).success) return { ok: false, error: "Commande invalide." };
  const { admin, order } = await guardClient(orderId);
  if (!admin || !order) return { ok: false, error: "Commande introuvable." };
  if (typeof proofPath !== "string" || !proofPath.startsWith(`sur-mesure/${orderId}/`)) return { ok: false, error: "Chemin invalide." };

  await admin.from("patron_custom_orders").update({ statut: "payment_review", payment_proof_path: proofPath }).eq("id", orderId);
  await notifyAdmins(admin, {
    title: "🧾 Preuve de paiement sur mesure",
    body: `« ${order.titre} » — une preuve de paiement attend votre validation.`,
    link: "/admin/sur-mesure",
  });
  revalidatePath("/dashboard/sur-mesure");
  revalidatePath("/admin/sur-mesure");
  return { ok: true };
}

/** Téléchargement du fichier patron fini — UNIQUEMENT si le paiement est validé. */
export async function getCustomPatronDownload(orderId: string) {
  if (!z.string().uuid().safeParse(orderId).success) return { ok: false as const, error: "Commande invalide." };
  const { admin, order } = await guardClient(orderId);
  if (!admin || !order) return { ok: false as const, error: "Commande introuvable." };
  if (order.statut !== "completed" || !order.file_path) return { ok: false as const, error: "Téléchargement non disponible (paiement non validé)." };

  const { data, error } = await admin.storage.from("custom-patrons").createSignedUrl(order.file_path, 300);
  if (error || !data) return { ok: false as const, error: "Lien indisponible." };
  return { ok: true as const, url: data.signedUrl };
}
