"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/**
 * Met à jour le type de compte de l'utilisateur connecté.
 * - "formations" : débloque l'espace élève (accès aux cours).
 * - "patrons"    : espace acheteur de patrons.
 * Stocké dans les métadonnées d'authentification (aucune migration requise).
 */
export async function setAccountType(type: "formations" | "patrons") {
  if (type !== "formations" && type !== "patrons") {
    return { ok: false, error: "Type de compte invalide." };
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Veuillez vous connecter." };

  const { error } = await supabase.auth.updateUser({ data: { account_type: type } });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard");
  return { ok: true };
}
