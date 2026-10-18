"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/** L'interrupteur « Notifications de La Cour » (Préférences) — pour la personne connectée seulement. */
export async function reglerNotifCour(actif: unknown): Promise<{ ok: true } | { ok: false; erreur: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, erreur: "Connectez-vous." };
  if (typeof actif !== "boolean") return { ok: false, erreur: "Réglage invalide." };
  const r = await createAdminClient().from("users").update({ notif_cour: actif }).eq("id", user.id);
  if (r.error) {
    return { ok: false, erreur: /notif_cour|column|schema cache/i.test(r.error.message) ? "Réglage bientôt disponible (migration 107 à appliquer)." : "Réglage non enregistré, réessayez." };
  }
  revalidatePath("/dashboard/preferences");
  return { ok: true };
}
