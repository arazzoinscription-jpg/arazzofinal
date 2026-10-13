/**
 * « Ma classe » — lecture des données (client Supabase fourni par l'appelant).
 * Réutilise le suivi pédagogique (chargerSuivi / chargerEleve) : aucune règle recalculée.
 * Seul ajout : la photo de profil (`users.avatar_url`), que le suivi ne lit pas.
 * LECTURE SEULE.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { chargerEleve, chargerSuivi, type DetailEleve, type ResultatSuivi } from "../student-care/read";
import { paquets } from "../student-care/paginate";
import type { Seuils } from "../student-care/rules";
import { avatarSur, trierCartes, versCarte, type CarteEleve } from "./vue";

type Client = SupabaseClient;

async function lireAvatars(admin: Client, ids: string[]): Promise<{ avatars: Map<string, string | null>; ok: boolean }> {
  const avatars = new Map<string, string | null>();
  let ok = true;
  for (const lot of paquets(ids, 100)) {
    // eslint-disable-next-line no-await-in-loop
    const r = await admin.from("users").select("id, avatar_url").in("id", lot);
    if (r.error) { ok = false; continue; } // la photo est un confort : en cas d'échec, initiales
    for (const u of (r.data ?? []) as { id: string; avatar_url: string | null }[]) avatars.set(u.id, avatarSur(u.avatar_url));
  }
  return { avatars, ok };
}

export interface Classe {
  cartes: CarteEleve[];
  suivi: Pick<ResultatSuivi, "complet" | "avertissements" | "calcule_le">;
  photos_lues: boolean;
}

export async function chargerClasse(
  admin: Client,
  { jourDebut, seuils, maintenant }: { jourDebut: string; seuils: Seuils; maintenant: Date },
): Promise<Classe> {
  const res = await chargerSuivi(admin, { jourDebut, seuils, maintenant });
  const { avatars, ok } = await lireAvatars(admin, res.eleves.map((e) => e.user_id));
  return {
    cartes: trierCartes(res.eleves.map((s) => versCarte(s, avatars.get(s.user_id) ?? null, maintenant, seuils.active_jours))),
    suivi: { complet: res.complet, avertissements: res.avertissements, calcule_le: res.calcule_le },
    photos_lues: ok,
  };
}

export async function chargerFiche(
  admin: Client,
  userId: string,
  opts: { jourDebut: string; seuils: Seuils; maintenant: Date },
): Promise<{ detail: DetailEleve; avatar: string | null } | null> {
  const detail = await chargerEleve(admin, userId, opts);
  if (!detail) return null;
  const { avatars } = await lireAvatars(admin, [userId]);
  return { detail, avatar: avatars.get(userId) ?? null };
}
