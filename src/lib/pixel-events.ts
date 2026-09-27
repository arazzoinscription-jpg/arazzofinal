/**
 * Émettre un événement de conversion vers le Pixel Meta (et GA4 si fourni),
 * AU MOMENT d'un geste (inscription, test terminé…).
 *
 * Même règle que `MetaPixel` / `GoogleTag` (chargés dans le layout) : rien ne
 * part si la personne n'a pas accepté les cookies. Sans consentement, ou si les
 * scripts ne sont pas chargés, l'appel est un no-op silencieux — jamais une erreur.
 */

const CONSENT_KEY = "arazzo_cookie_consent_v1";

export function pixelEvent(
  metaEvent: string,
  params: Record<string, unknown> = {},
  ga?: { name: string; params?: Record<string, unknown> },
) {
  if (typeof window === "undefined") return;
  let consenti = false;
  try { consenti = localStorage.getItem(CONSENT_KEY) === "accepted"; } catch { /* stockage indisponible */ }
  if (!consenti) return;
  const w = window as unknown as {
    fbq?: (...a: unknown[]) => void;
    gtag?: (...a: unknown[]) => void;
  };
  try { if (typeof w.fbq === "function") w.fbq("track", metaEvent, params); } catch { /* ignore */ }
  try { if (ga && typeof w.gtag === "function") w.gtag("event", ga.name, ga.params ?? {}); } catch { /* ignore */ }
}
