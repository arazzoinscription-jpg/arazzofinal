/**
 * Messagerie — pièces jointes (règles PURES, testables) : une photo ou un message vocal par message.
 * Les fichiers vivent dans le stockage PRIVÉ « messages » (migration 104), lus par des liens temporaires.
 */

export type GenrePiece = "image" | "audio" | "video";

export const BUCKET_MESSAGES = "messages";
export const IMAGE_MAX_OCTETS = 8 * 1024 * 1024;
export const AUDIO_MAX_OCTETS = 6 * 1024 * 1024;
/** Un message vocal dure 2 minutes au plus. */
export const AUDIO_MAX_S = 120;
/** Une vidéo ronde « face caméra » dure 1 minute au plus. */
export const VIDEO_MAX_S = 60;
/** Envoyée directement du téléphone au stockage (le serveur du site refuse plus de 4,5 Mo par requête). */
export const VIDEO_MAX_OCTETS = 25 * 1024 * 1024;
/** Durée de vie d'un lien de lecture (le widget recharge la conversation bien avant). */
export const LIEN_TTL_S = 3600;

const IMAGES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/heic": "heic", "image/heif": "heif" };
const VIDEOS: Record<string, string> = { "video/webm": "webm", "video/mp4": "mp4", "video/quicktime": "mov" };
const AUDIOS: Record<string, string> = {
  "audio/webm": "webm", "audio/ogg": "ogg", "audio/mp4": "m4a", "audio/x-m4a": "m4a", "audio/aac": "aac", "audio/mpeg": "mp3", "audio/wav": "wav",
};

/** « audio/webm;codecs=opus » → « audio/webm ». */
export function typeDeBase(mime: string): string {
  return mime.split(";")[0].trim().toLowerCase();
}

export function extensionPour(kind: GenrePiece, mime: string): string | null {
  const t = typeDeBase(mime);
  return (kind === "image" ? IMAGES : kind === "video" ? VIDEOS : AUDIOS)[t] ?? null;
}

/** Vérifie une pièce envoyée par le navigateur ; renvoie le message d'erreur, ou null si elle est acceptée. */
export function verifierPiece(p: { kind: unknown; type: string; size: number; duree?: unknown }): string | null {
  if (p.kind !== "image" && p.kind !== "audio" && p.kind !== "video") return "Pièce jointe inconnue.";
  if (!extensionPour(p.kind, p.type)) return p.kind === "image" ? "Choisissez une photo (JPEG, PNG, WebP ou HEIC)." : p.kind === "video" ? "Format vidéo non pris en charge." : "Format audio non pris en charge.";
  if (p.size < 100) return "Fichier vide.";
  if (p.kind === "image" && p.size > IMAGE_MAX_OCTETS) return "Photo trop lourde (8 Mo au plus).";
  if (p.kind === "audio") {
    if (p.size > AUDIO_MAX_OCTETS) return "Message vocal trop lourd.";
    const d = typeof p.duree === "number" ? p.duree : Number(p.duree);
    if (!Number.isFinite(d) || d < 1) return "Message vocal trop court.";
    if (d > AUDIO_MAX_S + 5) return `Un message vocal dure ${AUDIO_MAX_S / 60} minutes au plus.`;
  }
  if (p.kind === "video") {
    if (p.size > VIDEO_MAX_OCTETS) return "Vidéo trop lourde.";
    const d = typeof p.duree === "number" ? p.duree : Number(p.duree);
    if (!Number.isFinite(d) || d < 1) return "Vidéo trop courte.";
    if (d > VIDEO_MAX_S + 3) return "Une vidéo dure 1 minute au plus.";
  }
  return null;
}

/** La durée d'un vocal (1 → 120 s) ou d'une vidéo (1 → 60 s), ou null pour une photo. */
export function dureePiece(kind: GenrePiece, duree: unknown): number | null {
  if (kind === "image") return null;
  const max = kind === "video" ? VIDEO_MAX_S : AUDIO_MAX_S;
  const d = Math.round(typeof duree === "number" ? duree : Number(duree));
  return Number.isFinite(d) ? Math.min(max, Math.max(1, d)) : 1;
}

/** Ce qu'on affiche à la place du texte (liste des conversations, notification). */
export function apercuPiece(kind: GenrePiece | null | undefined, duree?: number | null): string {
  if (kind === "image") return "📷 Photo";
  if (kind === "audio") return `🎤 Message vocal${duree ? ` (${dureeLisible(duree)})` : ""}`;
  if (kind === "video") return `🎥 Vidéo${duree ? ` (${dureeLisible(duree)})` : ""}`;
  return "";
}

/** 42 → « 0:42 », 75 → « 1:15 ». */
export function dureeLisible(s: number): string {
  const t = Math.max(0, Math.round(s));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
}
