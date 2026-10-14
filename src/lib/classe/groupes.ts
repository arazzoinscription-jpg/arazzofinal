/**
 * Groupes = classes. Un groupe (promotion, atelier…) se consulte avec l'affichage de « Ma classe ».
 * Qui voit quel groupe : sa créatrice, ou l'administration (même règle que la page du groupe).
 * LECTURE SEULE.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Espace } from "../espace/portee";
import { paquets } from "../student-care/paginate";

export interface GroupeClasse {
  id: string;
  nom: string;
  description: string | null;
  couverture: string | null;
  creatrice: string | null;
  membres: string[];
}

export function peutVoirGroupe(e: Espace, g: Pick<GroupeClasse, "creatrice">): boolean {
  return e.estAdmin || g.creatrice === e.userId;
}

/** Les groupes de l'espace (administration : tous ; formatrice : ceux qu'elle a créés), avec leurs membres. */
export async function groupesDeLespace(admin: SupabaseClient, e: Espace): Promise<GroupeClasse[]> {
  let q = admin.from("groups").select("id, name, description, cover_image_url, creator_id, created_at").order("created_at", { ascending: false });
  if (!e.estAdmin) q = q.eq("creator_id", e.userId);
  const r = await q;
  if (r.error) throw new Error(`Groupes illisibles : ${r.error.message}`);
  const groupes = ((r.data ?? []) as { id: string; name: string | null; description: string | null; cover_image_url: string | null; creator_id: string | null }[])
    .map((g) => ({ id: g.id, nom: g.name ?? "Groupe", description: g.description, couverture: g.cover_image_url, creatrice: g.creator_id, membres: [] as string[] }));
  const parId = new Map(groupes.map((g) => [g.id, g]));
  for (const lot of paquets(groupes.map((g) => g.id), 100)) {
    // eslint-disable-next-line no-await-in-loop
    const m = await admin.from("group_members").select("group_id, user_id").in("group_id", lot);
    if (m.error) throw new Error(`Membres illisibles : ${m.error.message}`);
    for (const x of (m.data ?? []) as { group_id: string; user_id: string }[]) parId.get(x.group_id)?.membres.push(x.user_id);
  }
  return groupes;
}
