import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

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

  // Si la table n'existe pas encore (migration 028 non appliquée), on ignore en silence.
  if (error) return NextResponse.json({ ok: false });
  return NextResponse.json({ ok: true, id: data?.id ?? null });
}
