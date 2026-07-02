import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Vrai si l'utilisateur connecté est déjà un ÉTUDIANT inscrit — c.-à-d. inscrit
 * à AU MOINS une formation Arazzo. Le bouton « Demande d'enrôlement » n'est
 * affiché que pour ces étudiants (pas pour les visiteurs / non-inscrits).
 */
export async function isEnrolledStudent(): Promise<boolean> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const admin = createAdminClient();
  const { count } = await admin
    .from("enrollments")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);
  return (count ?? 0) > 0;
}
