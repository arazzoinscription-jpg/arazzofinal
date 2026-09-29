/**
 * Pont first-party vers le moteur de tracking d'Arazzo OS (écran /tracking).
 *
 * Les Pixels du navigateur (StartTest, TestCompleted, ViewContent…) partent vers
 * Meta. Ici, EN PLUS, on fait remonter les MÊMES moments du funnel du test vers
 * l'OS, pour qu'ils apparaissent dans /tracking (Canaux / Journal / Santé) — via
 * la route serveur `/api/track-event` (qui relaie à `POST /v1/track` de l'OS).
 *
 * Règles :
 *   - Même consentement que les Pixels : rien ne part sans cookies acceptés.
 *   - On ne fait REMONTER que des événements du funnel du test (allow-list côté
 *     serveur) qui n'ont PAS d'équivalent serveur — donc AUCUN doublon avec les
 *     `form_submitted` / `checkout_started` / `purchase` déjà enregistrés par l'OS.
 *   - Best-effort : un échec n'a jamais d'effet sur la page.
 */

import { getSessionId } from "@/components/analytics/analytics-tracker";

const CONSENT_KEY = "arazzo_cookie_consent_v1";

export function osTrackEvent(event: string, metadata: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  let consenti = false;
  try { consenti = localStorage.getItem(CONSENT_KEY) === "accepted"; } catch { /* stockage indispo */ }
  if (!consenti) return; // même règle que les Pixels : rien sans consentement

  try {
    fetch("/api/track-event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      keepalive: true,
      body: JSON.stringify({
        event,
        metadata,
        sessionId: getSessionId(),
        referrer: document.referrer || null,
        search: window.location.search || null,
      }),
    }).catch(() => { /* OS indisponible → sans effet */ });
  } catch { /* ignore */ }
}
