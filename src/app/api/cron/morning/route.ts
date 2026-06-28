import { NextRequest, NextResponse } from "next/server";
import { GET as sessionReminders } from "../session-reminders/route";
import { GET as reactivation } from "../reactivation/route";
import { createAdminClient } from "@/lib/supabase/admin";
import { runInstallmentReminders } from "@/lib/subscriptions";
import { runPackInstallmentReminders } from "@/lib/pack-subscriptions";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Dispatcher cron « matin » (08h).
 * Le plan Vercel Hobby est limité à 2 Cron Jobs : on regroupe ici les tâches
 * matinales (rappels de sessions live + emails de réactivation + rappels
 * d'échéance des abonnements par tranches).
 * Chaque sous-tâche garde sa propre logique et son propre contrôle CRON_SECRET.
 */
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results: Record<string, unknown> = {};
  for (const [name, fn] of [
    ["session-reminders", sessionReminders],
    ["reactivation", reactivation],
  ] as const) {
    try {
      const res = await fn(req);
      results[name] = await res.json().catch(() => ({ status: res.status }));
    } catch (e) {
      results[name] = { error: e instanceof Error ? e.message : String(e) };
    }
  }

  // Rappels d'échéance des abonnements (helper direct, pas une route).
  try {
    results["installment-reminders"] = await runInstallmentReminders(createAdminClient());
  } catch (e) {
    results["installment-reminders"] = { error: e instanceof Error ? e.message : String(e) };
  }

  // Rappels d'échéance des abonnements PACK.
  try {
    results["pack-installment-reminders"] = await runPackInstallmentReminders(createAdminClient());
  } catch (e) {
    results["pack-installment-reminders"] = { error: e instanceof Error ? e.message : String(e) };
  }

  return NextResponse.json({ ok: true, results });
}
