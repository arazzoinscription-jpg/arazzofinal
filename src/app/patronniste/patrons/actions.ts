"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyUser } from "@/lib/sur-mesure-notify";
import { isPatronniste, isFormateur } from "@/lib/roles";

async function guard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: prof } = await supabase.from("users").select("role, roles").eq("id", user.id).single();
  if (!isPatronniste(prof) && !isFormateur(prof)) return null;
  return user;
}

export async function deletePatron(id: string) {
  const user = await guard();
  if (!user) return { ok: false, error: "Accès refusé" };
  const admin = createAdminClient();
  const { error } = await admin.from("patrons").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/patronniste/patrons");
  return { ok: true };
}

/**
 * Un patronniste prend en charge une commande sur mesure (« Je la fais »).
 * Atomique : la mise à jour ne réussit que si la commande n'a PAS encore de
 * responsable (`patronniste_id IS NULL`) → premier arrivé, premier servi.
 */
export async function claimCustomOrder(id: string) {
  const user = await guard();
  if (!user) return { ok: false, error: "Accès refusé" };
  const admin = createAdminClient();
  // Atomique : ne réussit que si la commande est diffusée ET sans responsable.
  const { data, error } = await admin
    .from("patron_custom_orders")
    .update({ patronniste_id: user.id, statut: "en_cours", claimed_at: new Date().toISOString() })
    .eq("id", id)
    .eq("statut", "awaiting_patronniste")
    .is("patronniste_id", null)
    .select("id, client_id, titre");
  if (error) return { ok: false, error: error.message };
  if (!data || data.length === 0) return { ok: false, error: "Déjà prise par une autre patronniste." };
  await notifyUser(admin, data[0].client_id, {
    title: "🧵 Votre commande sur mesure est prise en charge",
    body: `« ${data[0].titre} » : une patronniste a accepté et a commencé votre patron.`,
    link: "/dashboard/sur-mesure",
  });
  revalidatePath("/patronniste/sur-mesure");
  revalidatePath("/admin/sur-mesure");
  revalidatePath("/dashboard/sur-mesure");
  return { ok: true };
}

/** Prépare une URL d'upload signée pour le fichier patron fini (bucket privé custom-patrons). */
export async function createCustomDeliveryUploadUrl(orderId: string, ext: string) {
  const user = await guard();
  if (!user) return { ok: false as const, error: "Accès refusé" };
  if (!z.string().uuid().safeParse(orderId).success) return { ok: false as const, error: "Commande invalide." };
  const cleanExt = (ext || "").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 6);
  if (!["pdf", "zip", "rar", "png", "jpg", "jpeg", "dxf", "plt"].includes(cleanExt)) {
    return { ok: false as const, error: "Format non supporté." };
  }
  const admin = createAdminClient();
  const { data: order } = await admin.from("patron_custom_orders").select("patronniste_id, statut").eq("id", orderId).maybeSingle();
  if (!order || order.patronniste_id !== user.id) return { ok: false as const, error: "Cette commande ne vous appartient pas." };

  const path = `${orderId}/${randomUUID()}.${cleanExt}`;
  const { data, error } = await admin.storage.from("custom-patrons").createSignedUploadUrl(path);
  if (error || !data) return { ok: false as const, error: "Préparation de l'envoi impossible." };
  return { ok: true as const, path: data.path, token: data.token };
}

/** Le patronniste livre le fichier patron fini → la cliente peut payer puis télécharger. */
export async function deliverCustomPatron(orderId: string, filePath: string) {
  const user = await guard();
  if (!user) return { ok: false, error: "Accès refusé" };
  if (!z.string().uuid().safeParse(orderId).success) return { ok: false, error: "Commande invalide." };
  if (typeof filePath !== "string" || !filePath.startsWith(`${orderId}/`)) return { ok: false, error: "Chemin invalide." };
  const admin = createAdminClient();
  const { data: order } = await admin.from("patron_custom_orders").select("patronniste_id, client_id, titre, statut").eq("id", orderId).maybeSingle();
  if (!order || order.patronniste_id !== user.id) return { ok: false, error: "Cette commande ne vous appartient pas." };
  if (order.statut !== "en_cours") return { ok: false, error: "La commande n'est pas en cours." };

  await admin.from("patron_custom_orders")
    .update({ statut: "delivered", file_path: filePath, delivered_at: new Date().toISOString() })
    .eq("id", orderId);
  await notifyUser(admin, order.client_id, {
    title: "📦 Votre patron sur mesure est prêt",
    body: `« ${order.titre} » est terminé. Réglez le paiement pour débloquer le téléchargement.`,
    link: "/dashboard/sur-mesure",
  });
  revalidatePath("/patronniste/sur-mesure");
  revalidatePath("/admin/sur-mesure");
  revalidatePath("/dashboard/sur-mesure");
  return { ok: true };
}

export async function updateCustomOrderStatus(id: string, statut: string) {
  const user = await guard();
  if (!user) return { ok: false, error: "Accès refusé" };
  const allowed = ["en_attente", "en_cours", "termine", "annule"];
  if (!allowed.includes(statut)) return { ok: false, error: "Statut invalide" };
  const admin = createAdminClient();
  const { error } = await admin
    .from("patron_custom_orders")
    .update({ statut, patronniste_id: user.id })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/patronniste/sur-mesure");
  return { ok: true };
}
