import "server-only";
import { createHash } from "crypto";

/**
 * Intégration Bunny Stream pour les vidéos courtes de la communauté.
 *
 * Flux d'upload (le fichier ne transite jamais par notre serveur — limite 4,5 Mo
 * de Vercel) :
 *  1. `createBunnyVideo(title)` crée l'objet vidéo côté Bunny → renvoie le GUID.
 *  2. `bunnyTusAuth(videoId)` génère une signature TUS temporaire.
 *  3. Le navigateur téléverse le fichier en TUS directement vers Bunny avec
 *     cette signature (la clé API reste secrète, côté serveur uniquement).
 *  4. Bunny transcode ; la lecture se fait via HLS depuis la pull zone.
 */

// Bibliothèque Stream DÉDIÉE au feed communauté (séparée des cours / patrons).
// Repli sur les variables génériques BUNNY_* si les variables _FEED_ ne sont
// pas définies → aucune régression si on n'a pas (encore) de library feed.
const LIBRARY_ID = process.env.BUNNY_FEED_LIBRARY_ID ?? process.env.BUNNY_LIBRARY_ID ?? "";
const API_KEY = process.env.BUNNY_FEED_API_KEY ?? process.env.BUNNY_API_KEY ?? "";
const PULL_ZONE = (process.env.NEXT_PUBLIC_BUNNY_FEED_PULL_ZONE ?? process.env.NEXT_PUBLIC_BUNNY_PULL_ZONE ?? "").replace(/\/$/, "");
const VIDEO_API = "https://video.bunnycdn.com/library";

/** ID de la library feed (pour l'embed iframe côté client). */
export const FEED_LIBRARY_ID = LIBRARY_ID;

export function isBunnyConfigured(): boolean {
  return Boolean(LIBRARY_ID && API_KEY && PULL_ZONE);
}

/** Crée un objet vidéo vide côté Bunny Stream et renvoie son GUID. */
export async function createBunnyVideo(title: string): Promise<{ ok: true; videoId: string } | { ok: false; error: string }> {
  if (!isBunnyConfigured()) return { ok: false, error: "Bunny Stream non configuré." };
  try {
    const res = await fetch(`${VIDEO_API}/${LIBRARY_ID}/videos`, {
      method: "POST",
      headers: { AccessKey: API_KEY, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ title: title.slice(0, 120) || "Vidéo communauté" }),
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
 * Génère les paramètres d'upload TUS signés (à passer à tus-js-client côté client).
 * Signature = SHA256(library_id + api_key + expiration + video_id).
 */
export function bunnyTusAuth(videoId: string): {
  endpoint: string;
  libraryId: string;
  videoId: string;
  expire: number;
  signature: string;
} {
  const expire = Math.floor(Date.now() / 1000) + 60 * 60; // 1 h
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

/** URLs de lecture publiques (la pull zone est publique ; HLS + miniature). */
export function bunnyPlaybackUrls(videoId: string): { hls: string; thumbnail: string; preview: string } {
  return {
    hls: `${PULL_ZONE}/${videoId}/playlist.m3u8`,
    thumbnail: `${PULL_ZONE}/${videoId}/thumbnail.jpg`,
    preview: `${PULL_ZONE}/${videoId}/preview.webp`,
  };
}

/** Supprime une vidéo côté Bunny (lors de la suppression d'un post). */
export async function deleteBunnyVideo(videoId: string): Promise<void> {
  if (!isBunnyConfigured()) return;
  try {
    await fetch(`${VIDEO_API}/${LIBRARY_ID}/videos/${videoId}`, {
      method: "DELETE",
      headers: { AccessKey: API_KEY, Accept: "application/json" },
    });
  } catch { /* best-effort */ }
}
