import { NextRequest, NextResponse } from "next/server";
import { GET as cleanupImages } from "../cleanup-images/route";
import { GET as surMesureRealert } from "../sur-mesure-realert/route";
import { GET as formateurDigest } from "../formateur-digest/route";
import { createAdminClient } from "@/lib/supabase/admin";
import { runProspectInactivity } from "@/lib/prospects";
import { cleanupOldLogs } from "@/lib/cleanup-logs";

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
    ["formateur-digest", formateurDigest],
  ] as const) {
    try {
      const res = await fn(req);
      results[name] = await res.json().catch(() => ({ status: res.status }));
    } catch (e) {
      results[name] = { error: e instanceof Error ? e.message : String(e) };
    }
  }

  // Inactivité prospect ≥ 12 mois (helper direct) : email « conserver le compte ? »
  // puis marquage « À supprimer » (suppression réelle = validation admin manuelle).
  try {
    results["prospect-inactivity"] = await runProspectInactivity(createAdminClient());
  } catch (e) {
    results["prospect-inactivity"] = { error: e instanceof Error ? e.message : String(e) };
  }

  // Purge des vieux journaux (analytics, emails, notifications, activité) →
  // garde la base sous le quota Supabase Free (500 Mo).
  try {
    results["cleanup-logs"] = await cleanupOldLogs();
  } catch (e) {
    results["cleanup-logs"] = { error: e instanceof Error ? e.message : String(e) };
  }

  return NextResponse.json({ ok: true, results });
}
