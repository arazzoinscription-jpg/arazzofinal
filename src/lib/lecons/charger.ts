import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { aplatirLecons, miniatureDe, type CoursBrut, type LeconBiblio } from "./bibliotheque";

/**
 * Les leçons qu'une personne de l'équipe peut reprendre : comme « Mes cours », celles de SES cours et des cours
 * importés (formateur_id NULL) ; l'admin, celles de tous les cours. Lecture par le client ADMIN (la RLS ne
 * renverrait pas les cours non possédés) — l'appelant a déjà vérifié le rôle.
 */
export async function chargerLecons(admin: SupabaseClient, userId: string, estAdmin: boolean): Promise<LeconBiblio[]> {
  let requete = admin
    .from("courses")
    .select("id, titre_fr, published, ordre, chapters(id, titre, ordre, lessons(id, titre, video_url_bunny, duree_minutes, ordre, created_at, devoir, devoir_obligatoire))");
  if (!estAdmin) requete = requete.or(`formateur_id.eq.${userId},formateur_id.is.null`);
  const { data } = await requete;
  const bibliotheque = process.env.BUNNY_LIBRARY_ID ?? "";
  const pullZone = process.env.NEXT_PUBLIC_BUNNY_PULL_ZONE ?? "";
  return aplatirLecons((data ?? []) as CoursBrut[], (video) => miniatureDe(video, bibliotheque, pullZone));
}
