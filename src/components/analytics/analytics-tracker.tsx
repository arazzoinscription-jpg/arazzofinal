"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/** Identifiant de session (persistant côté navigateur) pour regrouper les visites. */
function getSessionId(): string {
  try {
    let s = localStorage.getItem("arazzo_sid");
    if (!s) {
      s = (crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`);
      localStorage.setItem("arazzo_sid", s);
    }
    return s;
  } catch {
    return "anon";
  }
}

/**
 * Traceur de pages vues (anonyme) → /api/track.
 * Enregistre chaque page visitée + le référent, puis la durée passée (beacon au départ).
 * N'enregistre PAS les pages d'administration.
 */
export function AnalyticsTracker() {
  const pathname = usePathname();
  const visitId = useRef<string | null>(null);
  const start = useRef<number>(Date.now());

  useEffect(() => {
    if (!pathname || pathname.startsWith("/admin")) return;

    visitId.current = null;
    start.current = Date.now();
    let cancelled = false;
    const device = typeof window !== "undefined" && window.innerWidth < 768 ? "mobile" : "desktop";

    fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: pathname, referrer: document.referrer || null, sessionId: getSessionId(), device }),
      keepalive: true,
    })
      .then((r) => r.json())
      .then((d) => { if (!cancelled) visitId.current = d?.id ?? null; })
      .catch(() => {});

    const flush = () => {
      const id = visitId.current;
      if (!id) return;
      const duration = Math.round((Date.now() - start.current) / 1000);
      try {
        navigator.sendBeacon(
          "/api/track",
          new Blob([JSON.stringify({ visitId: id, duration })], { type: "application/json" }),
        );
      } catch { /* ignore */ }
    };

    const onVisibility = () => { if (document.visibilityState === "hidden") flush(); };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", flush);

    return () => {
      cancelled = true;
      flush();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", flush);
    };
  }, [pathname]);

  return null;
}
