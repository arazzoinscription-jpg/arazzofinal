import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Relaie un événement du funnel du test vers le moteur de tracking d'Arazzo OS
 * (`POST /v1/track`), pour qu'il apparaisse dans l'écran /tracking (Canaux /
 * Journal / Santé) — en plus du Pixel navigateur qui, lui, va vers Meta.
 *
 * ALLOW-LIST stricte : uniquement des événements du funnel du test qui n'ont PAS
 * d'équivalent enregistré côté serveur par l'OS → aucun doublon possible avec
 * `form_submitted` / `checkout_started` / `purchase` / `payment_proof_uploaded`.
 *
 * On NE transmet NI consentement pub NI e-mail : l'OS range l'événement en
 * first-party (par canal) mais ne le re-transmet à AUCUNE régie — le Pixel du
 * navigateur s'en charge déjà, on ne compte pas deux fois côté Meta.
 *
 * Best-effort : sans `ARAZZO_OS_URL` / `ARAZZO_TRACKING_KEY`, on ignore en silence.
 */
const ALLOWED = new Set([
  "view_content",
  "level_test_started",
  "level_test_completed",
  "level_result_viewed",
]);

function parseUtm(search: string | null): Record<string, string> {
  const out: Record<string, string> = {};
  if (!search) return out;
  try {
    const q = new URLSearchParams(search.startsWith("?") ? search : `?${search}`);
    for (const k of ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"]) {
      const v = q.get(k);
      if (v) out[k] = v.slice(0, 200);
    }
  } catch { /* rien */ }
  return out;
}

export async function POST(req: Request) {
  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false }); }

  const event = typeof body.event === "string" ? body.event : "";
  const sessionId = typeof body.sessionId === "string" ? body.sessionId.slice(0, 64) : null;
  if (!ALLOWED.has(event) || !sessionId) return NextResponse.json({ ok: false });

  const base = process.env.ARAZZO_OS_URL;
  const key = process.env.ARAZZO_TRACKING_KEY;
  if (!base || !key) return NextResponse.json({ ok: false }); // pont non configuré

  const referrer = typeof body.referrer === "string" ? body.referrer.slice(0, 500) : null;
  const search = typeof body.search === "string" ? body.search : null;
  const metadata = (body.metadata && typeof body.metadata === "object" && !Array.isArray(body.metadata))
    ? (body.metadata as Record<string, unknown>) : {};

  const controller = new AbortController();
  const minuteur = setTimeout(() => controller.abort(), 3000);
  try {
    await fetch(`${base.replace(/\/$/, "")}/v1/track`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        key,
        event,
        anonymous_id: sessionId,
        session_id: sessionId,
        referrer: referrer ?? undefined,
        utm: parseUtm(search),
        metadata,
      }),
    });
  } catch { /* OS indisponible → sans effet sur le site */ } finally {
    clearTimeout(minuteur);
  }
  return NextResponse.json({ ok: true });
}
