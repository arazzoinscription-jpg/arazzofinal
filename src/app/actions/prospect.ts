"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { startProspectAndWelcome } from "@/lib/prospects";

/**
 * Démarre le suivi prospect + envoie l'email de bienvenue.
 * Appelée juste après une inscription réussie (formulaire email ET OAuth).
 * Best-effort : ne bloque jamais l'inscription et n'échoue jamais côté client.
 */
export async function onProspectSignup(input: {
  userId: string;
  nom?: string | null;
  email?: string | null;
  source?: string;
}) {
  try {
    if (!input?.userId) return;
    const admin = createAdminClient();
    await startProspectAndWelcome(admin, input.userId, {
      nom: input.nom ?? null,
      email: input.email ?? null,
      source: input.source || "direct",
    });
  } catch {
    /* best-effort */
  }
}
