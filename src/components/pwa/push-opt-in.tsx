"use client";

import { useEffect, useState } from "react";
import { Bell, X, Loader2 } from "lucide-react";
import { savePushSubscription, deletePushSubscription } from "@/app/actions/push";

const DISMISS_KEY = "arazzo-push-dismissed";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

/**
 * Bannière discrète « Activer les notifications ». Ne s'affiche que si le
 * navigateur supporte le push, que la permission n'est pas encore accordée/refusée,
 * et que l'utilisateur ne l'a pas déjà masquée. Après acceptation, s'abonne et
 * envoie la souscription au serveur.
 */
export function PushOptIn() {
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const supported =
      "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
    const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!supported || !key) return;
    if (Notification.permission !== "default") return; // déjà accordée ou refusée
    if (localStorage.getItem(DISMISS_KEY) === "1") return;
    setShow(true);
  }, []);

  async function enable() {
    setError(null);
    setBusy(true);
    try {
      const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setShow(false);
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const existing = await reg.pushManager.getSubscription();
      const sub =
        existing ??
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(key) as BufferSource,
        }));

      const json = sub.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
      if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
        throw new Error("Abonnement incomplet.");
      }
      const res = await savePushSubscription(
        { endpoint: json.endpoint, keys: { p256dh: json.keys.p256dh, auth: json.keys.auth } },
        navigator.userAgent,
      );
      if (!res.ok) {
        // Nettoie l'abonnement navigateur si le serveur l'a refusé.
        if (!existing) await sub.unsubscribe().catch(() => {});
        setError(res.error ?? "Erreur");
        return;
      }
      setShow(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Impossible d'activer les notifications.");
    } finally {
      setBusy(false);
    }
  }

  function dismiss() {
    try { localStorage.setItem(DISMISS_KEY, "1"); } catch {}
    setShow(false);
  }

  if (!show) return null;

  return (
    <div className="mb-4 rounded-2xl border border-violet-200 dark:border-white/10 bg-violet-50 dark:bg-white/[0.04] p-3.5 flex items-center gap-3">
      <span className="w-10 h-10 rounded-xl bg-violet-600 text-white flex items-center justify-center flex-shrink-0">
        <Bell size={18} />
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-violet-950 dark:text-white">Activer les notifications</p>
        <p className="text-xs text-violet-950/60 dark:text-white/50 truncate">
          {error ?? "Sois prévenu·e des nouveaux cours, messages et commandes."}
        </p>
      </div>
      <button
        onClick={enable}
        disabled={busy}
        className="inline-flex items-center gap-2 bg-orange-DEFAULT hover:bg-orange-600 disabled:opacity-60 text-white text-sm font-semibold px-3.5 py-2 rounded-xl transition-colors flex-shrink-0"
      >
        {busy ? <Loader2 size={15} className="animate-spin" /> : <Bell size={15} />} Activer
      </button>
      <button onClick={dismiss} aria-label="Plus tard" className="text-violet-950/40 dark:text-white/40 hover:text-violet-950/70 dark:hover:text-white/70 flex-shrink-0">
        <X size={18} />
      </button>
    </div>
  );
}
