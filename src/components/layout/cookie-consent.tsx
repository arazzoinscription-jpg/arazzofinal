"use client";

import { useEffect, useState } from "react";

const KEY = "arazzo_cookie_consent_v1";

/**
 * Bandeau de consentement cookies. Arazzo n'utilise que des cookies strictement
 * nécessaires (session/connexion Supabase) + une mesure d'audience interne ;
 * le bandeau informe et mémorise le choix localement (localStorage).
 */
export function CookieConsent() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(KEY)) setShow(true);
    } catch { /* stockage indisponible → on n'affiche rien */ }
  }, []);

  function decide(value: "accepted" | "declined") {
    try { localStorage.setItem(KEY, value); } catch { /* ignore */ }
    setShow(false);
  }

  if (!show) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[60] p-3 sm:p-4">
      <div className="mx-auto max-w-3xl bg-white dark:bg-[#15102b] border border-cream-200 dark:border-white/10 rounded-2xl shadow-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-3">
        <p className="flex-1 text-sm text-gray-600 dark:text-white/70 font-dm leading-relaxed">
          🍪 Ce site utilise des cookies nécessaires à votre connexion et à la mesure d'audience.
          En continuant, vous acceptez notre utilisation des cookies.
        </p>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => decide("declined")}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-500 dark:text-white/60 border border-gray-200 dark:border-white/15 hover:bg-gray-50 dark:hover:bg-white/5"
          >
            Refuser
          </button>
          <button
            onClick={() => decide("accepted")}
            className="px-5 py-2 rounded-xl text-sm font-semibold text-white bg-orange-DEFAULT bg-orange-600 hover:bg-orange-700"
          >
            Accepter
          </button>
        </div>
      </div>
    </div>
  );
}
