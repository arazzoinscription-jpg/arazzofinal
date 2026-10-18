"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { bunnyPlaybackUrls, bunnyTusAuth, createBunnyVideo, isBunnyConfigured } from "@/lib/bunny/stream";
import { verifierPhotoStory } from "@/lib/stories/regles";
import { DUREE_VIDEO_RESULTAT_MAX_S, legendeResultat } from "@/lib/resultats";
import { signalerAValider, statutPourAuteur } from "@/lib/visiteuses/moderation";
import { prevenirLaCour } from "@/lib/cour-notifications-envoi";

/**
 * « Mon modèle est terminé » : l'élève publie son résultat — une publication de la communauté
 * (source « student_result ») : alerte « Bravo ! » 24 h sur le feed, puis publication de son profil.
 * Photo : stockage « posts », dossier resultats/ (hors purge des images de groupe) ; vidéo : Bunny Stream.
 */

const INDISPONIBLE = "La publication des résultats n'est pas encore activée sur ce site (migration 100 à appliquer).";

async function connectee() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

type Reponse = { ok: true; enAttente?: boolean } | { ok: false; erreur: string };

/** Crée la publication + son média ; tout est annulé si le média est refusé. Visiteuse : en attente de validation (B). */
async function creerPublication(userId: string, legende: string, media: Record<string, unknown>): Promise<Reponse> {
  const admin = createAdminClient();
  const st = await statutPourAuteur(admin, userId);
  if (!st.ok) return st;
  const { data: post, error } = await admin.from("posts")
    .insert({ author_id: userId, group_id: null, content: legende, published: st.published, ...(st.a_valider ? { a_valider: true } : {}) }).select("id").single();
  if (error || !post) return { ok: false, erreur: "Publication impossible." };
  let cm = await admin.from("community_media").insert({ post_id: post.id, source_type: "student_result", status: "ready", ...media });
  // Migration 107 pas encore appliquée : la vidéo part sans la mesure du son.
  if (cm.error && /son_propre/.test(cm.error.message)) {
    const { son_propre: _s, ...sansMesure } = media;
    cm = await admin.from("community_media").insert({ post_id: post.id, source_type: "student_result", status: "ready", ...sansMesure });
  }
  if (cm.error) {
    await admin.from("posts").delete().eq("id", post.id);
    return { ok: false, erreur: /check constraint|source_type/i.test(cm.error.message) ? INDISPONIBLE : cm.error.message };
  }
  if (st.a_valider) await signalerAValider(admin, "Le résultat d'un modèle");
  else await prevenirLaCour(admin, { auteurId: userId, quoi: "resultat" });
  revalidatePath("/communaute");
  revalidatePath(`/communaute/u/${userId}`);
  return { ok: true, enAttente: st.a_valider };
}

export async function publierResultatPhoto(fd: FormData): Promise<Reponse> {
  const user = await connectee();
  if (!user) return { ok: false, erreur: "Connectez-vous pour publier votre résultat." };
  const f = fd.get("photo");
  if (!(f instanceof File)) return { ok: false, erreur: "Choisissez la photo de votre modèle." };
  const pb = verifierPhotoStory({ type: f.type, size: f.size });
  if (pb) return { ok: false, erreur: pb };
  const admin = createAdminClient();
  const ext = (f.type.split("/")[1] || "jpg").replace("jpeg", "jpg");
  const chemin = `resultats/${user.id}/${randomUUID()}.${ext}`;
  const up = await admin.storage.from("posts").upload(chemin, Buffer.from(await f.arrayBuffer()), { contentType: f.type, upsert: false });
  if (up.error) return { ok: false, erreur: "Envoi de la photo impossible, réessayez." };
  const { data: pub } = admin.storage.from("posts").getPublicUrl(chemin);
  const r = await creerPublication(user.id, legendeResultat(fd.get("legende")), { media_kind: "image", media_url: pub.publicUrl, thumbnail_url: pub.publicUrl });
  if (!r.ok) await admin.storage.from("posts").remove([chemin]);
  return r;
}

export async function demarrerResultatVideo(): Promise<{ ok: true; videoId: string; tus: ReturnType<typeof bunnyTusAuth> } | { ok: false; erreur: string }> {
  const user = await connectee();
  if (!user) return { ok: false, erreur: "Connectez-vous pour publier votre résultat." };
  if (!isBunnyConfigured()) return { ok: false, erreur: "Les vidéos ne sont pas disponibles sur ce serveur : publiez une photo." };
  const st = await statutPourAuteur(createAdminClient(), user.id);
  if (!st.ok) return st;
  const v = await createBunnyVideo(`Résultat ${user.id.slice(0, 8)}`);
  if (!v.ok) return { ok: false, erreur: v.error };
  return { ok: true, videoId: v.videoId, tus: bunnyTusAuth(v.videoId) };
}

export async function finaliserResultatVideo(entree: { videoId: unknown; duree: unknown; legende: unknown; sonPropre?: unknown }): Promise<Reponse> {
  const user = await connectee();
  if (!user) return { ok: false, erreur: "Connectez-vous pour publier votre résultat." };
  if (typeof entree.videoId !== "string" || !/^[0-9a-f-]{8,64}$/i.test(entree.videoId)) return { ok: false, erreur: "Vidéo invalide." };
  const d = typeof entree.duree === "number" ? Math.round(entree.duree) : NaN;
  if (!Number.isFinite(d) || d < 1 || d > DUREE_VIDEO_RESULTAT_MAX_S) return { ok: false, erreur: `La vidéo du résultat dure ${DUREE_VIDEO_RESULTAT_MAX_S / 60} minutes au plus.` };
  return creerPublication(user.id, legendeResultat(entree.legende), {
    media_kind: "video", bunny_video_id: entree.videoId, duration_seconds: d, thumbnail_url: bunnyPlaybackUrls(entree.videoId).thumbnail,
    ...(typeof entree.sonPropre === "boolean" ? { son_propre: entree.sonPropre } : {}),
  });
}
