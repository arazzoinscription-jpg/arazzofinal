import "server-only";
import { createHash } from "crypto";

/**
 * Intégration Bunny Stream pour les VIDÉOS DE COURS (library dédiée « cours »,
 * distincte du feed communauté et des patrons).
 *
 * Flux d'upload identique au feed (TUS résumable, le fichier ne transite jamais
 * par notre serveur — limite 4,5 Mo de Vercel) :
 *  1. `createCourseVideo(title)` crée l'objet vidéo côté Bunny → renvoie le GUID.
 *  2. `courseTusAuth(videoId)` génère une signature TUS temporaire.
 *  3. Le navigateur téléverse en TUS directement vers Bunny.
 *  4. Bunny transcode en HLS multi-qualité ; lecture via l'iframe mediadelivery.
 */

const LIBRARY_ID = process.env.BUNNY_LIBRARY_ID ?? "";
const API_KEY = process.env.BUNNY_API_KEY ?? "";
const VIDEO_API = "https://video.bunnycdn.com/library";

export function isCourseStreamConfigured(): boolean {
  return Boolean(LIBRARY_ID && API_KEY);
}

/** Crée un objet vidéo vide dans la library cours et renvoie son GUID. */
export async function createCourseVideo(
  title: string
): Promise<{ ok: true; videoId: string } | { ok: false; error: string }> {
  if (!isCourseStreamConfigured()) return { ok: false, error: "Bunny Stream cours non configuré." };
  try {
    const res = await fetch(`${VIDEO_API}/${LIBRARY_ID}/videos`, {
      method: "POST",
      headers: { AccessKey: API_KEY, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ title: title.slice(0, 200) || "Vidéo de cours" }),
    });
    if (!res.ok) return { ok: false, error: `Bunny: ${res.status}` };
    const data = (await res.json()) as { guid?: string };
    if (!data.guid) return { ok: false, error: "Réponse Bunny invalide." };
    return { ok: true, videoId: data.guid };
  } catch {
    return { ok: false, error: "Service vidéo indisponible." };
  }
}

/**
 * Paramètres d'upload TUS signés (pour tus-js-client côté client).
 * Signature = SHA256(library_id + api_key + expiration + video_id).
 */
export function courseTusAuth(videoId: string): {
  endpoint: string;
  libraryId: string;
  videoId: string;
  expire: number;
  signature: string;
} {
  const expire = Math.floor(Date.now() / 1000) + 2 * 60 * 60; // 2 h (les cours sont volumineux)
  const signature = createHash("sha256")
    .update(LIBRARY_ID + API_KEY + expire + videoId)
    .digest("hex");
  return {
    endpoint: "https://video.bunnycdn.com/tusupload",
    libraryId: LIBRARY_ID,
    videoId,
    expire,
    signature,
  };
}

/** URL d'embed iframe (lue par LessonWatch → resolveEmbed). */
export function courseEmbedUrl(videoId: string): string {
  return `https://iframe.mediadelivery.net/embed/${LIBRARY_ID}/${videoId}`;
}

/** Supprime une vidéo de cours côté Bunny. */
export async function deleteCourseVideo(videoId: string): Promise<void> {
  if (!isCourseStreamConfigured()) return;
  try {
    await fetch(`${VIDEO_API}/${LIBRARY_ID}/videos/${videoId}`, {
      method: "DELETE",
      headers: { AccessKey: API_KEY, Accept: "application/json" },
    });
  } catch { /* best-effort */ }
}
