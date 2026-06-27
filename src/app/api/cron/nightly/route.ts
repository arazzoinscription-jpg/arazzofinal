import { NextRequest, NextResponse } from "next/server";
import { GET as cleanupImages } from "../cleanup-images/route";
import { GET as surMesureRealert } from "../sur-mesure-realert/route";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Dispatcher cron « nuit » (03h).
 * Le plan Vercel Hobby est limité à 2 Cron Jobs : on regroupe ici les tâches
 * qui tournaient toutes deux à 03h (nettoyage images + ré-alerte sur-mesure).
 * Chaque sous-tâche garde sa propre logique et son propre contrôle CRON_SECRET.
 */
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results: Record<string, unknown> = {};
  for (const [name, fn] of [
    ["cleanup-images", cleanupImages],
    ["sur-mesure-realert", surMesureRealert],
  ] as const) {
    try {
      const res = await fn(req);
      results[name] = await res.json().catch(() => ({ status: res.status }));
    } catch (e) {
      results[name] = { error: e instanceof Error ? e.message : String(e) };
    }
  }

  return NextResponse.json({ ok: true, results });
}
