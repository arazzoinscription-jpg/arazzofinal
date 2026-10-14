import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { NIVEAUX } from "@/lib/niveaux";

/** Cours de niveau → « N1 », « N2 », « N3 » (même correspondance que src/lib/niveaux.ts). */
const CODE_PAR_COURS = new Map(Object.entries(NIVEAUX).map(([slug, id]) => [id, `N${slug.replace("niveau-", "")}`]));

/** Niveaux (N1/N2/N3) auxquels un membre est inscrit — lecture seule, aucune autre donnée d'inscription. */
export async function niveauxDuMembre(userId: string): Promise<string[]> {
  const { data, error } = await createAdminClient().from("enrollments").select("course_id").eq("user_id", userId).in("course_id", [...CODE_PAR_COURS.keys()]);
  if (error) return [];
  return [...new Set(((data ?? []) as { course_id: string }[]).map((e) => CODE_PAR_COURS.get(e.course_id)).filter(Boolean) as string[])].sort();
}
