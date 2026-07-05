"use client";

import { useEffect } from "react";

/**
 * Enregistre le service worker (/sw.js) au chargement. Monté dans le layout
 * racine. L'abonnement aux notifications push est géré séparément par
 * <PushOptIn> (nécessite une action explicite de l'utilisateur).
 */
export function PwaRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* enregistrement SW échoué (mode privé, etc.) : non bloquant */
      });
    };

    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });

    return () => window.removeEventListener("load", register);
  }, []);

  return null;
}
