"use client";

import { useEffect } from "react";

/**
 * Émet l'événement `Purchase` de Meta — la conversion la plus importante pour
 * optimiser les publicités sur les VRAIES ventes.
 *
 * Trois garde-fous :
 *   - N'est rendu QUE pour une commande réellement payée (`paid`) : une commande
 *     en attente de validation (virement/CCP) n'est PAS un achat tant que l'admin
 *     n'a pas confirmé — la déclarer fausserait Meta.
 *   - Respecte le consentement (le Pixel n'existe que si les cookies sont
 *     acceptés) ; sinon on n'émet rien.
 *   - Porte un `eventID` STABLE = l'identifiant de commande. Le jour où la
 *     Conversions API (côté serveur) enverra le même achat, Meta les
 *     dédupliquera automatiquement grâce à cet identifiant partagé.
 */

const CONSENT_KEY = "arazzo_cookie_consent_v1";

export function PurchasePixel({
  orderId, value, currency = "DZD", paid, category,
}: {
  orderId: string;
  value: number;
  currency?: string;
  paid: boolean;
  /** Métier acheté, pour séparer les stats : "formation" ou "patron". */
  category?: "formation" | "patron";
}) {
  useEffect(() => {
    if (!paid || !orderId) return undefined;
    let envoye = false;
    let essais = 0;

    const emettre = () => {
      if (envoye) return;
      let consenti = false;
      try { consenti = localStorage.getItem(CONSENT_KEY) === "accepted"; } catch { /* rien */ }
      const fbq = (window as unknown as { fbq?: (...a: unknown[]) => void }).fbq;
      if (consenti && typeof fbq === "function") {
        fbq(
          "track",
          "Purchase",
          {
            value: Number(value) || 0,
            currency,
            content_type: "product",
            ...(category ? { content_category: category } : {}),
          },
          { eventID: orderId },
        );
        envoye = true;
        return;
      }
      // Le Pixel se charge après le consentement : on réessaie brièvement.
      if (essais < 20) { essais += 1; window.setTimeout(emettre, 400); }
    };

    emettre();
    // Si la personne accepte les cookies sur cette page même, on émet aussitôt.
    window.addEventListener("arazzo-cookie-consent", emettre);
    return () => window.removeEventListener("arazzo-cookie-consent", emettre);
  }, [paid, orderId, value, currency]);

  return null;
}
