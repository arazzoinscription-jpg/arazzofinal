/**
 * « Ma classe » — lecture des données (client Supabase fourni par l'appelant).
 * Réutilise le suivi pédagogique (chargerSuivi / chargerEleve) : aucune règle recalculée.
 * Seul ajout : la photo de profil (`users.avatar_url`), que le suivi ne lit pas.
 * LECTURE SEULE.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { chargerEleve, chargerSuivi, suiviPourEleves, type DetailEleve, type ResultatSuivi } from "../student-care/read";
import { paquets } from "../student-care/paginate";
import type { Seuils, SuiviEleve } from "../student-care/rules";
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
  { jourDebut, seuils, maintenant, garder }: { jourDebut: string; seuils: Seuils; maintenant: Date; garder?: (s: SuiviEleve) => boolean },
): Promise<Classe> {
  const res = await chargerSuivi(admin, { jourDebut, seuils, maintenant });
  const eleves = garder ? res.eleves.filter(garder) : res.eleves;
  const { avatars, ok } = await lireAvatars(admin, eleves.map((e) => e.user_id));
  return {
    cartes: trierCartes(eleves.map((s) => versCarte(s, avatars.get(s.user_id) ?? null, maintenant, seuils.active_jours))),
    suivi: { complet: res.complet, avertissements: res.avertissements, calcule_le: res.calcule_le },
    photos_lues: ok,
  };
}

/**
 * La classe d'un GROUPE : ses membres, avec les mêmes règles de suivi (toutes inscriptions,
 * quelle que soit la date de début du suivi). Les membres sans inscription ou hors de l'espace
 * ne sont pas affichés (signalé dans les avertissements).
 */
export async function chargerClasseMembres(
  admin: Client,
  ids: string[],
  { seuils, maintenant, garder }: { seuils: Seuils; maintenant: Date; garder?: (s: SuiviEleve) => boolean },
): Promise<Classe> {
  const { suivis, complet } = await suiviPourEleves(admin, ids, { seuils, maintenant });
  const tous = [...suivis.values()];
  const eleves = garder ? tous.filter(garder) : tous;
  const { avatars, ok } = await lireAvatars(admin, eleves.map((e) => e.user_id));
  const avertissements: string[] = [];
  if (!complet) avertissements.push("Lecture incomplète : la liste n'est pas exhaustive.");
  const sansSuivi = new Set(ids).size - tous.length;
  if (sansSuivi > 0) avertissements.push(`${sansSuivi} membre(s) sans inscription à une formation (ou compte d'équipe) : non affiché(s).`);
  if (tous.length > eleves.length) avertissements.push(`${tous.length - eleves.length} membre(s) inscrit(s) hors de vos cours : non affiché(s).`);
  return {
    cartes: trierCartes(eleves.map((s) => versCarte(s, avatars.get(s.user_id) ?? null, maintenant, seuils.active_jours))),
    suivi: { complet, avertissements, calcule_le: maintenant.toISOString() },
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
