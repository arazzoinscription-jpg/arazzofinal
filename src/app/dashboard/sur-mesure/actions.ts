"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyPatronnistes, notifyUser, notifyAdmins } from "@/lib/sur-mesure-notify";
import { notifyAdminEmail } from "@/lib/admin-notify";
import { z } from "zod";
import { createBunnyVideo, bunnyTusAuth, isBunnyConfigured, FEED_LIBRARY_ID } from "@/lib/bunny/stream";
import { MESURE_FIELDS, buildSurMesureNote, orderType, SUR_MESURE, type SurMesureType } from "./constants";

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
  const type: SurMesureType = String(formData.get("type") || "") === "placement" ? "placement" : "patron";
  const isPlacement = type === "placement";
  // Type conservé via marqueur en tête de note (compat sans colonne dédiée — voir constants.ts).
  const note = buildSurMesureNote(type, String(formData.get("note") || ""));
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
    title: isPlacement ? "💬 Demande de placement sur mesure" : "💬 Demande de prix sur mesure",
    body: `« ${titre} » — une cliente attend une proposition de prix${isPlacement ? " (placement)" : ""}.`,
    link: "/admin/sur-mesure",
  });
  await notifyAdminEmail(
    isPlacement ? "📐 Nouvelle demande de placement sur mesure" : "🧵 Nouvelle commande patron sur mesure",
    {
      "Prestation": isPlacement ? "Placement sur mesure" : "Patron sur mesure",
      "Modèle": titre,
      "Tissu": tissu, "Taille": taille,
      "Cliente": user.email,
      "Mesures": Object.keys(mesures).length ? `${Object.keys(mesures).length} renseignée(s)` : "—",
    },
    { intro: "Une cliente attend une proposition de prix.", link: "/admin/sur-mesure" },
  );

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
    .select("id, client_id, titre, statut, proposed_price_dzd, file_path, note, mesures")
    .eq("id", orderId)
    .maybeSingle();
  if (!order || order.client_id !== user.id) return { user, admin, order: null };
  return { user, admin, order };
};

/**
 * Le client ACCEPTE le prix proposé → la commande est diffusée aux patronnistes.
 * Pour un PLACEMENT patron, le client choisit aussi le FORMAT (pdf | papier) :
 * le prix retenu (proposed_price_dzd) devient le prix du format choisi.
 */
export async function acceptCustomPrice(orderId: string, format?: "pdf" | "papier") {
  if (!z.string().uuid().safeParse(orderId).success) return { ok: false, error: "Commande invalide." };
  const { admin, order } = await guardClient(orderId);
  if (!admin || !order) return { ok: false, error: "Commande introuvable." };
  if (order.statut !== "price_proposed") return { ok: false, error: "Cette commande n'attend pas votre accord." };

  const mesures = ((order as any).mesures ?? {}) as Record<string, unknown>;
  const isPlacementPatron = mesures.kind === "placement_patron";

  const update: Record<string, unknown> = { statut: "awaiting_patronniste" };
  let formatLabel = "";
  if (isPlacementPatron) {
    if (format !== "pdf" && format !== "papier") return { ok: false, error: "Choisissez le format (PDF ou papier imprimé)." };
    const chosen = format === "papier" ? Number(mesures.prix_papier_dzd) : Number(mesures.prix_pdf_dzd ?? order.proposed_price_dzd);
    if (!Number.isFinite(chosen) || chosen <= 0) return { ok: false, error: "Prix du format indisponible." };
    update.proposed_price_dzd = Math.round(chosen);
    update.mesures = { ...mesures, format_choisi: format };
    formatLabel = format === "papier" ? "Papier imprimé (livré)" : "PDF (à télécharger)";
  }

  await admin.from("patron_custom_orders").update(update).eq("id", orderId);

  const finalPrice = Number(update.proposed_price_dzd ?? order.proposed_price_dzd ?? 0);
  const svc = SUR_MESURE[orderType(order)];
  await notifyPatronnistes(admin, {
    title: isPlacementPatron ? "🧵 Placement en demande — disponible" : `🧵 Nouveau ${svc.noun} sur mesure disponible`,
    body: `« ${order.titre} »${isPlacementPatron ? ` — ${formatLabel}` : ` (${svc.short})`} — ${finalPrice.toLocaleString("fr-DZ")} DA. Première patronniste à l'accepter le prend.`,
  });

  if (isPlacementPatron) {
    await notifyAdminEmail("📐 Placement en demande (accepté par la cliente)", {
      "Commande": order.titre,
      "Format choisi": formatLabel,
      "Prix retenu": `${finalPrice.toLocaleString("fr-DZ")} DA`,
    }, { intro: "La cliente a accepté le devis et choisi son format. La commande est diffusée aux patronnistes.", link: "/admin/sur-mesure" });
  }

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
 * Placement PAPIER : une fois le patron réalisé (statut "delivered"), la cliente
 * renseigne ses coordonnées de livraison → la commande passe en "completed" avec
 * un sous-statut livraison "a_expedier" (stocké dans mesures). Paiement à la
 * livraison (COD), comme les autres livraisons du site.
 */
export async function submitPlacementDelivery(
  orderId: string,
  coords: { nom: string; phone: string; wilaya: string; adresse?: string },
) {
  if (!z.string().uuid().safeParse(orderId).success) return { ok: false, error: "Commande invalide." };
  const { admin, order } = await guardClient(orderId);
  if (!admin || !order) return { ok: false, error: "Commande introuvable." };
  if (order.statut !== "delivered") return { ok: false, error: "Le patron n'est pas encore prêt." };

  const mesures = ((order as any).mesures ?? {}) as Record<string, unknown>;
  if (mesures.kind !== "placement_patron" || mesures.format_choisi !== "papier") {
    return { ok: false, error: "Cette commande n'est pas une livraison papier." };
  }
  const nom = (coords?.nom ?? "").trim().slice(0, 120);
  const phone = (coords?.phone ?? "").trim().slice(0, 40);
  const wilaya = (coords?.wilaya ?? "").trim().slice(0, 60);
  const adresse = (coords?.adresse ?? "").trim().slice(0, 300);
  if (!nom || !phone || !wilaya) return { ok: false, error: "Renseignez au moins le nom, le téléphone et la wilaya." };

  await admin.from("patron_custom_orders").update({
    statut: "completed",
    mesures: { ...mesures, livraison: { nom, phone, wilaya, adresse }, livraison_statut: "a_expedier" },
  }).eq("id", orderId);

  await notifyAdmins(admin, {
    title: "📦 Placement papier à expédier",
    body: `« ${order.titre} » — ${nom} · ${phone} · ${wilaya}. Coordonnées de livraison reçues.`,
    link: "/admin/sur-mesure",
  });
  await notifyAdminEmail("📦 Placement papier — à expédier", {
    "Commande": order.titre,
    "Destinataire": nom, "Téléphone": phone, "Wilaya": wilaya, "Adresse": adresse || "—",
  }, { intro: "La cliente a renseigné ses coordonnées : le patron papier est à expédier.", link: "/admin/sur-mesure" });

  revalidatePath("/dashboard/sur-mesure");
  revalidatePath("/admin/sur-mesure");
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
