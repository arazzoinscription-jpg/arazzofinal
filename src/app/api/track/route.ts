import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/** Extrait les UTM d'une chaîne de requête (`?utm_source=…`). */
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

/**
 * Transfère la visite au moteur de tracking d'Arazzo (`POST /v1/track`).
 *
 * C'est CE chaînon qui manquait : le site comptait ses visites pour lui (table
 * `page_visits`) et les envoyait à Meta (pixel), mais ne les disait jamais à
 * Arazzo — d'où un tableau « Tracking & Attribution » resté à zéro visite.
 *
 * On envoie un `page_view` ANONYME (juste l'identifiant de session, aucune
 * donnée personnelle) SANS consentement pub : Arazzo range alors la visite par
 * canal (via UTM + référent) en first-party, et ne la re-transmet à AUCUNE régie
 * — le pixel du navigateur s'en charge déjà, inutile de compter deux fois.
 *
 * Best-effort : si Arazzo est indisponible, le site n'en souffre jamais.
 */
async function forwardToArazzo(opts: {
  sessionId: string | null; path: string; search: string | null; referrer: string | null;
}): Promise<void> {
  const base = process.env.ARAZZO_OS_URL;
  const key = process.env.ARAZZO_TRACKING_KEY;
  if (!base || !key || !opts.sessionId) return; // pas branché → on ignore en silence
  const page = opts.search ? `${opts.path}${opts.search}` : opts.path;
  const controller = new AbortController();
  const minuteur = setTimeout(() => controller.abort(), 3000);
  try {
    await fetch(`${base.replace(/\/$/, "")}/v1/track`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        key,
        event: "page_view",
        anonymous_id: opts.sessionId,
        session_id: opts.sessionId,
        page,
        referrer: opts.referrer ?? undefined,
        utm: parseUtm(opts.search),
      }),
    });
  } catch { /* Arazzo indisponible ne casse jamais le site */ } finally {
    clearTimeout(minuteur);
  }
}

/** Déduit la source d'entrée à partir du référent. */
function deriveSource(ref: string | null): string {
  if (!ref) return "direct";
  try {
    const h = new URL(ref).hostname.replace(/^www\./, "").toLowerCase();
    if (/(^|\.)google\./.test(h)) return "google";
    if (/(^|\.)bing\./.test(h)) return "bing";
    if (/duckduckgo\./.test(h)) return "duckduckgo";
    if (/(facebook|fb)\./.test(h)) return "facebook";
    if (/instagram\./.test(h)) return "instagram";
    if (/(t\.co|twitter\.|x\.com)/.test(h)) return "twitter";
    if (/tiktok\./.test(h)) return "tiktok";
    if (/youtube\.|youtu\.be/.test(h)) return "youtube";
    if (/(whatsapp|wa\.me)/.test(h)) return "whatsapp";
    if (/(t\.me|telegram)/.test(h)) return "telegram";
    return "other";
  } catch {
    return "direct";
  }
}

export async function POST(req: Request) {
  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false }); }

  const admin = createAdminClient();

  // ── Mode mise à jour : durée passée sur une visite existante ──
  if (typeof body.visitId === "string" && typeof body.duration === "number") {
    const dur = Math.max(0, Math.min(Math.round(body.duration), 7200));
    await admin.from("page_visits").update({ duration_sec: dur }).eq("id", body.visitId);
    return NextResponse.json({ ok: true });
  }

  // ── Mode insertion : nouvelle page vue ──
  const path = typeof body.path === "string" ? body.path.slice(0, 300) : null;
  if (!path) return NextResponse.json({ ok: false });

  const rawRef = typeof body.referrer === "string" && body.referrer ? body.referrer.slice(0, 500) : null;
  let sameOrigin = false;
  if (rawRef) {
    try { sameOrigin = new URL(rawRef).host === new URL(req.url).host; } catch { /* ignore */ }
  }
  const source = sameOrigin ? "internal" : deriveSource(rawRef);

  // Transfert vers Arazzo lancé EN PARALLÈLE de l'écriture locale (on n'en garde
  // pas la visite otage). Ignoré pour une visite interne (navigation sur le site).
  const arazzo = sameOrigin ? Promise.resolve() : forwardToArazzo({
    sessionId: typeof body.sessionId === "string" ? body.sessionId : null,
    path,
    search: typeof body.search === "string" ? body.search : null,
    referrer: rawRef,
  });

  const { data, error } = await admin
    .from("page_visits")
    .insert({
      session_id: typeof body.sessionId === "string" ? body.sessionId.slice(0, 64) : null,
      path,
      referrer: sameOrigin ? null : rawRef,
      source,
      user_id: typeof body.userId === "string" ? body.userId : null,
      device: body.device === "mobile" ? "mobile" : "desktop",
    })
    .select("id")
    .maybeSingle();

  await arazzo; // best-effort, déjà à l'abri de ses propres erreurs

  // Si la table n'existe pas encore (migration 028 non appliquée), on ignore en silence.
  if (error) return NextResponse.json({ ok: false });
  return NextResponse.json({ ok: true, id: data?.id ?? null });
}
