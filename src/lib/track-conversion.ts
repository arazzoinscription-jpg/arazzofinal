// Événements de conversion pour les landings — délèguent au helper canonique
// `pixelEvent` (Meta Pixel + GA4), qui ne part QUE si la personne a accepté les
// cookies (même règle que MetaPixel/GoogleTag du layout). Aucune donnée
// personnelle envoyée ; sans consentement/sans pixel, c'est un no-op silencieux.

import { pixelEvent } from "@/lib/pixel-events";

type Params = { value?: number | null; currency?: string; content_name?: string };

/** Un prospect / une inscription initiée (formulaire envoyé, sans paiement). */
export function trackLead(p: Params = {}) {
  const currency = p.currency || "DZD";
  pixelEvent(
    "Lead",
    { content_name: p.content_name, value: p.value ?? undefined, currency },
    {
      name: "generate_lead",
      params: {
        value: p.value ?? undefined, currency,
        items: p.content_name ? [{ item_name: p.content_name }] : undefined,
      },
    },
  );
}

/** Un achat / une preuve de paiement envoyée (inscription payée, patron acheté). */
export function trackPurchase(p: Params = {}) {
  const currency = p.currency || "DZD";
  const value = Number(p.value) || 0;
  pixelEvent(
    "Purchase",
    { content_name: p.content_name, value, currency },
    {
      name: "purchase",
      params: {
        value, currency, transaction_id: `web-${Date.now()}`,
        items: p.content_name ? [{ item_name: p.content_name }] : undefined,
      },
    },
  );
}
