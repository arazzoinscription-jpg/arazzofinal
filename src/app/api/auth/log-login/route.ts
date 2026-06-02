import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logActivity } from "@/lib/activity";

export const dynamic = "force-dynamic";

function parseDevice(ua: string): string {
  const os = /Windows/i.test(ua) ? "Windows" : /Mac/i.test(ua) ? "macOS" : /Android/i.test(ua) ? "Android"
    : /iPhone|iPad|iOS/i.test(ua) ? "iOS" : /Linux/i.test(ua) ? "Linux" : "Inconnu";
  const br = /Edg/i.test(ua) ? "Edge" : /OPR|Opera/i.test(ua) ? "Opera" : /Chrome/i.test(ua) ? "Chrome"
    : /Firefox/i.test(ua) ? "Firefox" : /Safari/i.test(ua) ? "Safari" : "Navigateur";
  return `${br} · ${os}`;
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });

  const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || req.headers.get("x-real-ip") || "—";
  const ua = req.headers.get("user-agent") || "";
  const device = parseDevice(ua);

  const admin = createAdminClient();
  await admin.from("login_history").insert({ user_id: user.id, ip, user_agent: ua.slice(0, 300), device });

  // Mettre à jour la liste des appareils (1 entrée par device label)
  const { data: existing } = await admin
    .from("user_devices").select("id").eq("user_id", user.id).eq("device_label", device).maybeSingle();
  if (existing) {
    await admin.from("user_devices").update({ last_ip: ip, last_seen: new Date().toISOString(), revoked: false }).eq("id", existing.id);
  } else {
    await admin.from("user_devices").insert({ user_id: user.id, device_label: device, last_ip: ip });
  }

  await logActivity(user.id, "login", { device, ip });

  return NextResponse.json({ ok: true });
}
