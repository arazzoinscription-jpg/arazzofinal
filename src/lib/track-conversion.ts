// Événements de conversion pour les landings — délèguent au helper canonique
// `pixelEvent` (Meta Pixel + GA4), qui ne part QUE si la personne a accepté les
// cookies (même règle que MetaPixel/GoogleTag du layout). Aucune donnée
// personnelle envoyée ; sans consentement/sans pixel, c'est un no-op silencieux.

import { pixelEvent, pixelCustom } from "@/lib/pixel-events";

type Params = { value?: number | null; currency?: string; content_name?: string };
type ProofParams = Params & { content_category?: "formation" | "patron"; order_id?: string };

/**
 * PREUVE de paiement CCP/BaridiMob ENVOYÉE — événement custom `PaymentProofSubmitted`.
 * Signifie « preuve envoyée, en attente de vérification » : ce n'est PAS un achat.
 * Le vrai `Purchase` n'est émis qu'à la validation admin (côté Arazzo OS, CAPI).
 */
export function trackPaymentProofSubmitted(p: ProofParams = {}) {
  const currency = p.currency || "DZD";
  pixelCustom("PaymentProofSubmitted", {
    content_name: p.content_name,
    ...(p.content_category ? { content_category: p.content_category } : {}),
    value: Number(p.value) || undefined,
    currency,
    ...(p.order_id ? { order_id: p.order_id } : {}),
  });
}

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
