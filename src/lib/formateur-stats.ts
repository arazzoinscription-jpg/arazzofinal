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

  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await admin
      .from("enrollments")
      .select("course_id, currency, amount")
      .in("course_id", courseIds)
      .range(from, from + PAGE - 1);
    if (error || !data || data.length === 0) break;

    for (const e of data as { course_id: string; currency: string | null; amount: number | null }[]) {
      const m = byCourse.get(e.course_id) ?? { count: 0, revDzd: 0, revEur: 0 };
      const amt = Number(e.amount) || 0;
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
