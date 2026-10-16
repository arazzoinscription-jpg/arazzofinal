import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { avatarSur } from "../classe/vue";
import { estEquipePublique, nomPublic } from "../nom-public";
import type { Calque } from "./calques";
import { paquets } from "../student-care/paginate";
import type { StoryVue } from "./regles";

/** Stories — lecture (clé de service, côté serveur). Les noms affichés sont les noms PUBLICS. */

const TABLE = "stories";

/** Message d'erreur si la migration 099 n'est pas appliquée, sinon null. */
export async function etatMigrationStories(admin: SupabaseClient): Promise<string | null> {
  const r = await admin.from(TABLE).select("id").limit(1);
  return r.error ? r.error.message : null;
}

interface LigneStory {
  id: string; user_id: string; media_kind: "image" | "video" | "texte"; media_url: string | null; bunny_video_id: string | null;
  thumbnail_url: string | null; duration_seconds: number | null; legende: string | null; created_at: string; expires_at: string;
  calques?: Calque[] | null; fond?: string | null;
  /** Story d'une visiteuse pas encore validée (migration 103) : jamais montrée. */
  a_valider?: boolean | null;
}

/**
 * Les enseignantes d'une élève (formatrices de ses cours) : leurs stories passent en premier.
 * Sans formation (visiteuse) : les formatrices des formations publiées, dans l'ordre du parcours.
 */
export async function enseignantesDe(admin: SupabaseClient, userId: string): Promise<string[]> {
  const ins = await admin.from("enrollments").select("course_id").eq("user_id", userId);
  const ids = [...new Set(((ins.data ?? []) as { course_id: string }[]).map((x) => x.course_id))];
  const c = ids.length
    ? await admin.from("courses").select("formateur_id").in("id", ids.slice(0, 200))
    : await admin.from("courses").select("formateur_id, ordre").eq("published", true).order("ordre", { ascending: true }).limit(50);
  return [...new Set(((c.data ?? []) as { formateur_id: string | null }[]).map((x) => x.formateur_id).filter((x): x is string => Boolean(x)))];
}

/**
 * Stories encore visibles (expires_at > maintenant) des personnes demandées — ou de tout le monde (null).
 * Tableau vide si la migration n'est pas appliquée (jamais d'erreur affichée aux élèves).
 */
export async function storiesActives(admin: SupabaseClient, userIds: string[] | null): Promise<StoryVue[]> {
  const maintenant = new Date().toISOString();
  const lignes: LigneStory[] = [];
  if (userIds === null) {
    const r = await admin.from(TABLE).select("*").gt("expires_at", maintenant).order("created_at", { ascending: false }).limit(300);
    if (r.error) return [];
    lignes.push(...((r.data ?? []) as LigneStory[]));
  } else {
    for (const lot of paquets([...new Set(userIds)], 100)) {
      // eslint-disable-next-line no-await-in-loop
      const r = await admin.from(TABLE).select("*").in("user_id", lot).gt("expires_at", maintenant).order("created_at");
      if (r.error) return [];
      lignes.push(...((r.data ?? []) as LigneStory[]));
    }
  }
  // Les stories en attente de validation (visiteuses) ne sont montrées à personne.
  const visibles = lignes.filter((l) => l.a_valider !== true);
  lignes.length = 0;
  lignes.push(...visibles);
  if (!lignes.length) return [];

  const auteurs = new Map<string, { id: string; nom: string | null; username: string | null; role: string | null; roles: string[] | null; avatar_url: string | null }>();
  for (const lot of paquets([...new Set(lignes.map((l) => l.user_id))], 100)) {
    // eslint-disable-next-line no-await-in-loop
    const u = await admin.from("users").select("id, nom, username, role, roles, avatar_url").in("id", lot);
    for (const p of (u.data ?? []) as { id: string; nom: string | null; username: string | null; role: string | null; roles: string[] | null; avatar_url: string | null }[]) auteurs.set(p.id, p);
  }
  return lignes.filter((l) => auteurs.has(l.user_id)).map((l) => {
    const a = auteurs.get(l.user_id)!;
    return {
      id: l.id, userId: l.user_id, nom: nomPublic(a), avatar: avatarSur(a.avatar_url),
      kind: l.media_kind, mediaUrl: l.media_url, bunnyVideoId: l.bunny_video_id, thumbnail: l.thumbnail_url,
      duree: l.duration_seconds, legende: l.legende, createdAt: l.created_at,
      calques: Array.isArray(l.calques) ? l.calques : [], fond: l.fond ?? null, equipe: estEquipePublique(a),
    };
  });
}
