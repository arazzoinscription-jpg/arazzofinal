import "server-only";
import webpush from "web-push";
import type { SupabaseClient } from "@supabase/supabase-js";

// Configuration VAPID (une seule fois par process). Les clés viennent de l'env :
//   NEXT_PUBLIC_VAPID_PUBLIC_KEY  (publique, aussi utilisée côté client)
//   VAPID_PRIVATE_KEY             (privée, serveur uniquement)
//   VAPID_SUBJECT                 (mailto: ou URL du site — contact d'abus)
let configured = false;
function ensureConfigured(): boolean {
  if (configured) return true;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return false;
  const subject = process.env.VAPID_SUBJECT || "mailto:arazzoinscription@gmail.com";
  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
  return true;
}

export function isPushConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
  icon?: string;
  /** Regroupe les notifications (une même `tag` remplace la précédente). */
  tag?: string;
  /** Nombre à afficher en badge sur l'icône de l'app (App Badging API). */
  badgeCount?: number;
};

type SubRow = { id: string; endpoint: string; p256dh: string; auth: string };

/**
 * Envoie une notification push à tous les appareils des utilisateurs donnés.
 * Best-effort : n'échoue jamais l'appelant, et purge les abonnements morts
 * (410 Gone / 404). Utilise le client ADMIN (service role) — RLS contournée.
 */
export async function sendPushToUsers(
  admin: SupabaseClient,
  userIds: string[],
  payload: PushPayload,
): Promise<void> {
  if (!ensureConfigured()) return;
  const ids = Array.from(new Set(userIds.filter(Boolean)));
  if (ids.length === 0) return;

  const { data: subs } = await admin
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .in("user_id", ids);
  if (!subs?.length) return;

  const body = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url ?? "/dashboard",
    icon: payload.icon,
    tag: payload.tag,
    badgeCount: payload.badgeCount,
  });

  const dead: string[] = [];
  await Promise.all(
    (subs as SubRow[]).map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          body,
        );
      } catch (err) {
        const code = (err as { statusCode?: number })?.statusCode;
        if (code === 404 || code === 410) dead.push(s.id);
      }
    }),
  );

  if (dead.length) {
    await admin.from("push_subscriptions").delete().in("id", dead);
  }
}

/**
 * Envoie un push à UN utilisateur en calculant automatiquement son badge
 * (= nombre de notifications non lues) → l'icône de l'app affiche le bon chiffre
 * même app fermée. Best-effort : n'échoue jamais l'appelant.
 */
export async function pushToUserWithBadge(
  admin: SupabaseClient,
  userId: string,
  payload: Omit<PushPayload, "badgeCount">,
): Promise<void> {
  try {
    const { count } = await admin
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .is("read_at", null);
    await sendPushToUsers(admin, [userId], { ...payload, badgeCount: count ?? undefined });
  } catch { /* ignore */ }
}
