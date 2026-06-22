"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const MANAGE_ROLES = ["patronniste", "formateur", "admin"];

async function guard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: prof } = await supabase.from("users").select("role").eq("id", user.id).single();
  if (!prof || !MANAGE_ROLES.includes(prof.role)) return null;
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
  const { data, error } = await admin
    .from("patron_custom_orders")
    .update({ patronniste_id: user.id, statut: "en_cours", claimed_at: new Date().toISOString() })
    .eq("id", id)
    .is("patronniste_id", null)
    .select("id");
  if (error) return { ok: false, error: error.message };
  if (!data || data.length === 0) return { ok: false, error: "Déjà prise par une autre patronniste." };
  revalidatePath("/patronniste/sur-mesure");
  revalidatePath("/admin/sur-mesure");
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
