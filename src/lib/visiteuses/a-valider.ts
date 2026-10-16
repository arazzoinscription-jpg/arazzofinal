import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { bunnyPlaybackUrls } from "@/lib/bunny/stream";
import type { Calque } from "@/lib/stories/calques";
import { migration103 } from "./load";

/** Une publication ou une story d'une visiteuse, en attente de validation (vue de l'administration). */
export interface AValider {
  type: "publication" | "story";
  id: string;
  auteur: { id: string; nom: string; email: string | null };
  quand: string;
  legende: string | null;
  media: { kind: "image" | "video" | "texte"; url: string | null; miniature: string | null; bunnyId: string | null; fond: string | null; calques: Calque[] };
  /** Participation à un défi : son titre. */
  defi: string | null;
  /** « Reel », « Résultat », « Vidéo Facebook », « Défi », « Story ». */
  nature: string;
}

const NATURE: Record<string, string> = { student_reel: "Reel", student_result: "Résultat du modèle", admin: "Vidéo Facebook" };

/** Tout ce qui attend la validation, le plus ancien d'abord. `dispo: false` si la migration 103 manque. */
export async function chargerAValider(admin: SupabaseClient): Promise<{ dispo: boolean; items: AValider[] }> {
  if (!(await migration103(admin))) return { dispo: false, items: [] };
  const [p, s] = await Promise.all([
    admin.from("posts").select("id, content, created_at, author:users(id, nom, email), media:community_media(id, source_type, media_kind, media_url, thumbnail_url, bunny_video_id, defi_id)")
      .eq("a_valider", true).order("created_at", { ascending: true }).limit(100),
    admin.from("stories").select("id, user_id, media_kind, media_url, bunny_video_id, thumbnail_url, legende, created_at, calques, fond, author:users(id, nom, email)")
      .eq("a_valider", true).order("created_at", { ascending: true }).limit(100),
  ]);
  type Auteur = { id: string; nom: string | null; email: string | null } | null;
  type Media = { id: string; source_type: string; media_kind: "image" | "video"; media_url: string | null; thumbnail_url: string | null; bunny_video_id: string | null; defi_id: string | null };
  const posts = (p.data ?? []) as unknown as { id: string; content: string | null; created_at: string; author: Auteur; media: Media[] | Media | null }[];
  const stories = (s.data ?? []) as unknown as { id: string; media_kind: "image" | "video" | "texte"; media_url: string | null; bunny_video_id: string | null; thumbnail_url: string | null; legende: string | null; created_at: string; calques: Calque[] | null; fond: string | null; author: Auteur }[];

  const defiIds = [...new Set(posts.flatMap((x) => (Array.isArray(x.media) ? x.media : x.media ? [x.media] : []).map((m) => m.defi_id)).filter(Boolean) as string[])];
  const titres = new Map<string, string>();
  if (defiIds.length) {
    const { data } = await admin.from("defis").select("id, titre").in("id", defiIds);
    for (const d of (data ?? []) as { id: string; titre: string }[]) titres.set(d.id, d.titre);
  }
  const auteur = (a: Auteur) => ({ id: a?.id ?? "", nom: (a?.nom ?? "").trim() || "Membre", email: a?.email ?? null });

  const items: AValider[] = [
    ...posts.map((x) => {
      const m = (Array.isArray(x.media) ? x.media[0] : x.media) ?? null;
      const bunny = m?.bunny_video_id ? bunnyPlaybackUrls(m.bunny_video_id) : null;
      return {
        type: "publication" as const, id: x.id, auteur: auteur(x.author), quand: x.created_at, legende: x.content,
        media: { kind: m?.media_kind ?? "image", url: m?.media_url ?? null, miniature: m?.thumbnail_url ?? bunny?.thumbnail ?? null, bunnyId: m?.bunny_video_id ?? null, fond: null, calques: [] },
        defi: m?.defi_id ? titres.get(m.defi_id) ?? "Défi" : null,
        nature: m?.defi_id ? "Défi de la semaine" : NATURE[m?.source_type ?? ""] ?? "Publication",
      };
    }),
    ...stories.map((x) => ({
      type: "story" as const, id: x.id, auteur: auteur(x.author), quand: x.created_at, legende: x.legende,
      media: { kind: x.media_kind, url: x.media_url, miniature: x.thumbnail_url, bunnyId: x.bunny_video_id, fond: x.fond, calques: Array.isArray(x.calques) ? x.calques : [] },
      defi: null, nature: "Story",
    })),
  ].sort((a, b) => a.quand.localeCompare(b.quand));
  return { dispo: true, items };
}

/** Les défis (récents d'abord) et leurs participations en ligne, pour l'administration. */
export interface DefiAdmin {
  id: string; titre: string; consigne: string; recompense: string; debut: string; fin: string; gagnant: string | null;
  participations: { mediaId: string; photo: string | null; auteur: string; legende: string | null }[];
}

export async function chargerDefisAdmin(admin: SupabaseClient): Promise<DefiAdmin[]> {
  const { data, error } = await admin.from("defis").select("id, titre, consigne, recompense, debut, fin, gagnant_media_id").order("debut", { ascending: false }).limit(8);
  if (error || !data?.length) return [];
  const ids = (data as { id: string }[]).map((d) => d.id);
  const { data: parts } = await admin.from("community_media")
    .select("id, defi_id, media_url, thumbnail_url, post:posts!inner(content, published, author:users(nom))")
    .in("defi_id", ids).order("created_at", { ascending: true }).limit(500);
  type P = { id: string; defi_id: string; media_url: string | null; thumbnail_url: string | null; post: { content: string | null; published: boolean | null; author: { nom: string | null } | null } | null };
  const liste = ((parts ?? []) as unknown as P[]).filter((p) => p.post?.published !== false);
  return (data as { id: string; titre: string; consigne: string; recompense: string; debut: string; fin: string; gagnant_media_id: string | null }[]).map((d) => ({
    id: d.id, titre: d.titre, consigne: d.consigne, recompense: d.recompense, debut: d.debut, fin: d.fin, gagnant: d.gagnant_media_id,
    participations: liste.filter((p) => p.defi_id === d.id).map((p) => ({
      mediaId: p.id, photo: p.thumbnail_url ?? p.media_url, auteur: (p.post?.author?.nom ?? "").trim() || "Membre", legende: p.post?.content ?? null,
    })),
  }));
}
