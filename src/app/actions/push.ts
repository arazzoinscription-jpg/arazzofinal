"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type SubInput = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

/** Enregistre (ou met à jour) l'abonnement push de l'appareil courant. */
export async function savePushSubscription(sub: SubInput, userAgent?: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Non authentifié." };

  if (!sub?.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) {
    return { ok: false, error: "Abonnement invalide." };
  }

  const admin = createAdminClient();
  // upsert sur endpoint (unique) : un même appareil ne crée pas de doublon,
  // et un abonnement peut « changer de propriétaire » si un autre compte se connecte.
  const { error } = await admin
    .from("push_subscriptions")
    .upsert(
      {
        user_id: user.id,
        endpoint: sub.endpoint,
        p256dh: sub.keys.p256dh,
        auth: sub.keys.auth,
        user_agent: userAgent?.slice(0, 300) ?? null,
        last_used_at: new Date().toISOString(),
      },
      { onConflict: "endpoint" },
    );
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/** Supprime l'abonnement push de l'appareil courant (désactivation). */
export async function deletePushSubscription(endpoint: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Non authentifié." };
  if (!endpoint) return { ok: false, error: "Endpoint manquant." };

  const admin = createAdminClient();
  await admin.from("push_subscriptions").delete().eq("endpoint", endpoint).eq("user_id", user.id);
  return { ok: true };
}
