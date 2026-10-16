"use client";

import { savePushSubscription } from "@/app/actions/push";

/** Ce que ce téléphone / navigateur permet pour les notifications du site. */
export type EtatNotifications = "non-supporte" | "bloque" | "a-activer" | "actif";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export function notificationsSupportees(): boolean {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window
    && Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY);
}

/** L'état actuel : abonnement présent sur CE téléphone, autorisation refusée, etc. */
export async function etatNotifications(): Promise<EtatNotifications> {
  if (!notificationsSupportees()) return "non-supporte";
  if (Notification.permission === "denied") return "bloque";
  if (Notification.permission !== "granted") return "a-activer";
  try {
    const reg = await navigator.serviceWorker.ready;
    return (await reg.pushManager.getSubscription()) ? "actif" : "a-activer";
  } catch {
    return "a-activer";
  }
}

/** Demande l'autorisation puis abonne ce téléphone (enregistré côté serveur). */
export async function abonnerAuxNotifications(): Promise<{ ok: true } | { ok: false; erreur: string }> {
  if (!notificationsSupportees()) return { ok: false, erreur: "Ce navigateur ne reçoit pas les notifications." };
  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return { ok: false, erreur: "Notifications refusées : autorisez-les dans les réglages du téléphone." };
    const reg = await navigator.serviceWorker.ready;
    const existant = await reg.pushManager.getSubscription();
    const sub = existant ?? (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!) as BufferSource,
    }));
    const json = sub.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
    if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return { ok: false, erreur: "Abonnement incomplet." };
    const res = await savePushSubscription({ endpoint: json.endpoint, keys: { p256dh: json.keys.p256dh, auth: json.keys.auth } }, navigator.userAgent);
    if (!res.ok) {
      if (!existant) await sub.unsubscribe().catch(() => {});
      return { ok: false, erreur: res.error ?? "Erreur" };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, erreur: e instanceof Error ? e.message : "Impossible d'activer les notifications." };
  }
}
