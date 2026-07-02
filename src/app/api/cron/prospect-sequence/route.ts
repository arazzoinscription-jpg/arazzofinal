import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { runProspectSequence } from "@/lib/prospects";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Séquence prospect (inscrits sans commande) : welcome + rappels J+2 / J+7 / J+14.
 * Appelée par le dispatcher cron « morning » (08h) — pas un cron Vercel dédié
 * (plan Hobby limité à 2 crons). Garde son propre contrôle CRON_SECRET.
 */
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const res = await runProspectSequence(createAdminClient());
  return NextResponse.json(res);
}
