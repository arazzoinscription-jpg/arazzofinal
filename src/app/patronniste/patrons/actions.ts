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
