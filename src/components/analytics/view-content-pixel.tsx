"use client";

import { useEffect } from "react";

/**
 * Émet l'événement `ViewContent` de Meta — « cette personne a regardé un
 * contenu précis » (une formation, un patron). C'est le signal qui permet de
 * recibler (retargeting) et de mesurer l'intérêt AVANT l'achat.
 *
 * Étiqueté par MÉTIER (`content_category` = "formation" ou "patron") pour pouvoir
 * séparer les deux lignes de produits dans Meta ET dans Arazzo, tout en gardant
 * un total commun.
 *
 * Respecte le consentement : `window.fbq` n'existe que si les cookies sont
 * acceptés (voir MetaPixel). Sinon, on n'émet rien.
 */

const CONSENT_KEY = "arazzo_cookie_consent_v1";

export function ViewContentPixel({
  category, name, id, value, currency = "DZD",
}: {
  category: "formation" | "patron";
  name?: string;
  id?: string;
  value?: number;
  currency?: string;
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
        fbq("track", "ViewContent", {
          content_type: "product",
          content_category: category,
          ...(name ? { content_name: name } : {}),
          ...(id ? { content_ids: [id] } : {}),
          ...(value != null ? { value: Number(value) || 0, currency } : {}),
        });
        envoye = true;
        return;
      }
      if (essais < 15) { essais += 1; window.setTimeout(emettre, 400); }
    };

    emettre();
    window.addEventListener("arazzo-cookie-consent", emettre);
    return () => window.removeEventListener("arazzo-cookie-consent", emettre);
  }, [category, name, id, value, currency]);

  return null;
}
