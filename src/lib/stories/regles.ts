/**
 * Stories — règles PURES (testables). Une story = une photo ou une vidéo de 30 s au plus,
 * visible 24 h par les membres connectés, autour de la photo de profil (anneau coloré).
 */

export const DUREE_STORY_MAX_S = 30;
export const VIE_STORY_MS = 24 * 60 * 60_000;
export const PHOTO_STORY_MAX_OCTETS = 8 * 1024 * 1024;
export const TYPES_PHOTO = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"] as const;
/** Durée d'affichage d'une photo dans la visionneuse. */
export const DUREE_PHOTO_MS = 6000;

export interface StoryVue {
  id: string;
  userId: string;
  nom: string;
  avatar: string | null;
  kind: "image" | "video";
  /** Photo : son URL ; vidéo : l'identifiant Bunny (lecteur intégré). */
  mediaUrl: string | null;
  bunnyVideoId: string | null;
  thumbnail: string | null;
  duree: number | null;
  legende: string | null;
  createdAt: string;
}

export function verifierPhotoStory(f: { type: string; size: number }): string | null {
  if (!(TYPES_PHOTO as readonly string[]).includes(f.type)) return "Choisissez une photo (JPEG, PNG, WebP ou HEIC).";
  if (f.size > PHOTO_STORY_MAX_OCTETS) return "Photo trop lourde (8 Mo au plus).";
  if (f.size < 100) return "Photo vide.";
  return null;
}

export function verifierDureeStory(secondes: unknown): { ok: true; duree: number } | { ok: false; erreur: string } {
  const d = typeof secondes === "number" ? Math.round(secondes) : NaN;
  if (!Number.isFinite(d) || d < 1) return { ok: false, erreur: "Vidéo illisible." };
  if (d > DUREE_STORY_MAX_S) return { ok: false, erreur: `Vidéo trop longue (${d} s) : une story dure ${DUREE_STORY_MAX_S} s au plus.` };
  return { ok: true, duree: d };
}

export function lireLegende(brut: unknown): string | null {
  const l = typeof brut === "string" ? brut.replace(/\s+/g, " ").trim().slice(0, 150) : "";
  return l || null;
}

/** Stories encore visibles, regroupées par personne (la plus ancienne d'abord dans chaque groupe). */
export function regrouper(stories: StoryVue[], maintenant: Date): Map<string, StoryVue[]> {
  const m = new Map<string, StoryVue[]>();
  for (const s of [...stories].sort((a, b) => a.createdAt.localeCompare(b.createdAt))) {
    if (maintenant.getTime() - new Date(s.createdAt).getTime() >= VIE_STORY_MS) continue;
    m.set(s.userId, [...(m.get(s.userId) ?? []), s]);
  }
  return m;
}

/** « il y a 3 h », « il y a 12 min ». */
export function ilYa(iso: string, maintenant: Date): string {
  const min = Math.max(0, Math.round((maintenant.getTime() - new Date(iso).getTime()) / 60_000));
  if (min < 1) return "à l'instant";
  if (min < 60) return `il y a ${min} min`;
  return `il y a ${Math.round(min / 60)} h`;
}
