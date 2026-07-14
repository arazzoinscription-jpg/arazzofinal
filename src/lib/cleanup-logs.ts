import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

const DAY = 24 * 60 * 60 * 1000;

/**
 * Purge des tables de journalisation qui grossissent sans limite (analytics,
 * logs d'emails, notifications, activité). Garde la base bien en dessous du
 * quota Supabase Free (500 Mo). Appelée par le cron « nightly ».
 *
 * ⚠️ On NE purge PAS reactivation_log / learning_reminders : ce sont des
 * verrous anti-doublon ; les vider relancerait des notifications déjà envoyées.
 */
const RETENTION: { table: string; days: number }[] = [
  { table: "page_visits", days: 90 },    // analytics — grossit le plus vite
  { table: "email_log", days: 120 },     // historique d'envois d'emails
  { table: "notifications", days: 120 }, // cloche : l'historique ancien est inutile
  { table: "activity_log", days: 180 },  // journal d'activité (on n'affiche que le récent)
];

export async function cleanupOldLogs(): Promise<Record<string, unknown>> {
  const admin = createAdminClient();
  const results: Record<string, unknown> = {};
  for (const { table, days } of RETENTION) {
    const cutoff = new Date(Date.now() - days * DAY).toISOString();
    try {
      const { error, count } = await admin
        .from(table)
        .delete({ count: "estimated" })
        .lt("created_at", cutoff);
      results[table] = error ? { error: error.message } : { deleted: count ?? 0, olderThanDays: days };
    } catch (e) {
      results[table] = { error: e instanceof Error ? e.message : String(e) };
    }
  }
  return results;
}
