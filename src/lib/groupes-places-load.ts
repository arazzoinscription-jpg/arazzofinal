import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { jaugeDe, type GroupeOuvert, type JaugePlaces } from "./groupes-places";

/**
 * Groupes ouverts à l'inscription d'un niveau (cours), avec le nombre de places prises.
 * Tableau vide si la migration 101 n'est pas appliquée (la landing s'affiche alors sans jauge).
 * Aucune donnée personnelle : seulement des noms de groupes, des dates et des nombres.
 */
export async function groupesOuverts(admin: SupabaseClient, courseId: string): Promise<GroupeOuvert[]> {
  const g = await admin.from("groups").select("id, name, debut, capacite, created_at")
    .eq("course_id", courseId).eq("inscription_ouverte", true).order("debut", { ascending: true, nullsFirst: false }).order("created_at");
  if (g.error || !g.data?.length) return [];
  const groupes = g.data as { id: string; name: string | null; debut: string | null; capacite: number | null }[];
  const out: GroupeOuvert[] = [];
  for (const x of groupes) {
    // eslint-disable-next-line no-await-in-loop
    const { count } = await admin.from("group_members").select("id", { count: "exact", head: true }).eq("group_id", x.id);
    out.push({ id: x.id, nom: (x.name ?? "").trim() || "Prochaine promo", debut: x.debut, capacite: x.capacite, prises: count ?? 0 });
  }
  return out;
}

/** Demandes d'inscription encore en attente pour ce niveau (« intéressées »). */
export async function interesseesEnAttente(admin: SupabaseClient, courseId: string): Promise<number> {
  const { count, error } = await admin.from("enrollment_requests").select("id", { count: "exact", head: true }).eq("course_id", courseId).eq("status", "pending");
  return error ? 0 : count ?? 0;
}

/** La jauge de la landing d'un niveau, ou null (aucun groupe ouvert avec un nombre de places). */
export async function jaugeNiveau(admin: SupabaseClient, courseId: string): Promise<JaugePlaces | null> {
  const groupes = await groupesOuverts(admin, courseId);
  if (!groupes.length) return null;
  return jaugeDe(groupes, await interesseesEnAttente(admin, courseId));
}
