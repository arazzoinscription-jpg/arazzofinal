import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Agrégation des inscriptions par cours, SANS la limite PostgREST de 1000 lignes.
 *
 * PostgREST plafonne chaque requête à 1000 lignes par défaut : un simple
 * `select(...).in("course_id", ids)` renvoyait au plus 1000 inscriptions →
 * « 1000 élèves » affiché alors qu'il y en a beaucoup plus, et des comptes par
 * cours faux (les inscriptions au-delà de la 1000ᵉ étaient ignorées).
 * On pagine avec `.range()` jusqu'à épuisement et on agrège côté serveur.
 *
 * À utiliser avec le client ADMIN (la RLS `enrollments_read_own` masque les
 * inscriptions des autres au client de session → le formateur verrait ~0).
 */
export interface EnrollAgg { count: number; revDzd: number; revEur: number; }

export async function aggregateEnrollments(
  admin: SupabaseClient,
  courseIds: string[],
): Promise<{ byCourse: Map<string, EnrollAgg>; total: number; revDzd: number; revEur: number }> {
  const byCourse = new Map<string, EnrollAgg>();
  let total = 0, revDzd = 0, revEur = 0;
  if (courseIds.length === 0) return { byCourse, total, revDzd, revEur };

  // Date de départ des gains : les inscriptions ANTÉRIEURES comptent 0 DA de revenu
  // (mais restent comptées dans le nombre d'élèves).
  const { data: cfg } = await admin.from("platform_config").select("gains_start_date").eq("id", 1).maybeSingle();
  const start = (cfg as { gains_start_date?: string | null } | null)?.gains_start_date
    ? String((cfg as { gains_start_date?: string | null }).gains_start_date) : null;
  const counts = (paidAt: string | null | undefined) => !start || (!!paidAt && String(paidAt).slice(0, 10) >= start);

  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await admin
      .from("enrollments")
      .select("course_id, currency, amount, paid_at")
      .in("course_id", courseIds)
      .range(from, from + PAGE - 1);
    if (error || !data || data.length === 0) break;

    for (const e of data as { course_id: string; currency: string | null; amount: number | null; paid_at: string | null }[]) {
      const m = byCourse.get(e.course_id) ?? { count: 0, revDzd: 0, revEur: 0 };
      const amt = counts(e.paid_at) ? (Number(e.amount) || 0) : 0; // revenu 0 si avant la date de départ
      m.count += 1;
      if (e.currency === "EUR") { m.revEur += amt; revEur += amt; }
      else { m.revDzd += amt; revDzd += amt; }
      byCourse.set(e.course_id, m);
      total += 1;
    }
    if (data.length < PAGE) break;
  }
  return { byCourse, total, revDzd, revEur };
}
