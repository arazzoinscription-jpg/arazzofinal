import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { estEquipePublique, nomPublic } from "./nom-public";
import { paquets } from "./student-care/paginate";
import { CORPS_COUR, TYPE_NOTIF_COUR, delaiCour, destinatairesCour, titreCour, type QuoiCour } from "./cour-notifications";

/** Toutes les lignes d'une requête, page par page (1 000 par page). */
async function toutLire<T>(lire: (de: number, a: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>): Promise<T[] | null> {
  const out: T[] = [];
  for (let de = 0; de < 200_000; de += 1000) {
    // eslint-disable-next-line no-await-in-loop
    const r = await lire(de, de + 999);
    if (r.error) return null;
    out.push(...(r.data ?? []));
    if ((r.data ?? []).length < 1000) break;
  }
  return out;
}

/**
 * Une nouvelle publication dans La Cour : prévenir TOUT LE MONDE (cloche du site + notification du téléphone via le
 * webhook des notifications), au plus une fois toutes les 3 h par personne (1 h pour une publication de l'équipe).
 * Jamais bloquant : une erreur ici n'empêche JAMAIS la publication. Renvoie le nombre de personnes prévenues.
 */
export async function prevenirLaCour(admin: SupabaseClient, e: { auteurId: string; quoi: QuoiCour }): Promise<number> {
  try {
    const { data: auteur } = await admin.from("users").select("id, nom, username, role, roles").eq("id", e.auteurId).maybeSingle();
    if (!auteur) return 0;
    const equipe = estEquipePublique(auteur as { id: string; nom: string | null; username: string | null; role: string | null; roles: string[] | null });
    const nom = nomPublic(auteur as { id: string; nom: string | null; username: string | null; role: string | null; roles: string[] | null });

    // Tout le monde, avec l'interrupteur « Notifications de La Cour » (migration 107 ; sans elle : personne n'a coupé).
    let membres = await toutLire<{ id: string; notif_cour?: boolean | null }>((de, a) => admin.from("users").select("id, notif_cour").order("id").range(de, a));
    if (!membres) membres = await toutLire<{ id: string }>((de, a) => admin.from("users").select("id").order("id").range(de, a));
    if (!membres?.length) return 0;
    const coupees = new Set(membres.filter((m) => (m as { notif_cour?: boolean | null }).notif_cour === false).map((m) => m.id));

    const depuis = new Date(Date.now() - delaiCour(equipe)).toISOString();
    const recentes = await toutLire<{ user_id: string }>((de, a) => admin.from("notifications").select("user_id")
      .eq("type", TYPE_NOTIF_COUR).gte("created_at", depuis).order("created_at", { ascending: false }).range(de, a)) ?? [];

    const ids = destinatairesCour({
      membres: membres.map((m) => m.id), auteurId: e.auteurId, coupees, dejaPrevenues: new Set(recentes.map((r) => r.user_id)),
    });
    const titre = titreCour(e.quoi, nom);
    for (const lot of paquets(ids, 500)) {
      // eslint-disable-next-line no-await-in-loop
      await admin.from("notifications").insert(lot.map((user_id) => ({ user_id, type: TYPE_NOTIF_COUR, title: titre, body: CORPS_COUR, link: "/communaute" })));
    }
    return ids.length;
  } catch {
    return 0;
  }
}
