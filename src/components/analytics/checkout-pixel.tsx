"use client";

import { useEffect } from "react";

/**
 * Émet l'événement `InitiateCheckout` de Meta — « cette personne a commencé le
 * paiement ». C'est l'étape juste avant l'achat : elle permet à Meta d'optimiser
 * tout le tunnel (pas seulement l'achat final) et de recibler les paniers
 * abandonnés.
 *
 * Étiqueté par métier (`content_category`) comme le reste. Respecte le
 * consentement : rien ne part si `window.fbq` n'existe pas (cookies refusés).
 */

const CONSENT_KEY = "arazzo_cookie_consent_v1";

export function CheckoutPixel({
  value, currency = "DZD", numItems, category,
}: {
  value: number;
  currency?: string;
  numItems?: number;
  category?: "formation" | "patron";
}) {
  useEffect(() => {
    let envoye = false;
    let essais = 0;

    const emettre = () => {
      if (envoye) return;
      let consenti = false;
      try { consenti = localStorage.getItem(CONSENT_KEY) === "accepted"; } catch { /* rien */ }
      const fbq = (window as unknown as { fbq?: (...a: unknown[]) => void }).fbq;
      if (consenti && typeof fbq === "function") {
        fbq("track", "InitiateCheckout", {
          value: Number(value) || 0,
          currency,
          content_type: "product",
          ...(numItems != null ? { num_items: numItems } : {}),
          ...(category ? { content_category: category } : {}),
        });
        envoye = true;
        return;
      }
      if (essais < 15) { essais += 1; window.setTimeout(emettre, 400); }
    };

    emettre();
    window.addEventListener("arazzo-cookie-consent", emettre);
    return () => window.removeEventListener("arazzo-cookie-consent", emettre);
  }, [value, currency, numItems, category]);

  return null;
}
