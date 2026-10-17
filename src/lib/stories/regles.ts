/**
 * Stories — règles PURES (testables). Une story = une photo ou une vidéo de 30 s au plus
 * (une vidéo plus longue devient plusieurs stories à la suite),
 * visible 24 h par les membres connectés, autour de la photo de profil (anneau coloré).
 */

import type { Calque } from "./calques";

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
  kind: "image" | "video" | "texte";
  /** Photo : son URL ; vidéo : l'identifiant Bunny (lecteur intégré). */
  mediaUrl: string | null;
  bunnyVideoId: string | null;
  /** Vidéo longue découpée : départ de CETTE story dans la vidéo, en secondes (migration 105). */
  debut?: number;
  thumbnail: string | null;
  duree: number | null;
  legende: string | null;
  createdAt: string;
  /** Texte, dessin, autocollants, question, sondage, compte à rebours, lien (migration 102). */
  calques: Calque[];
  /** Fond d'une story « texte seul ». */
  fond: string | null;
  /** L'autrice fait partie de l'équipe (enseignante, administration) : affichée en premier. */
  equipe: boolean;
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

/** Vidéo longue : découpée en plusieurs stories de 30 s au plus, publiées ensemble (5 min au plus = 10 stories). */
export const VIDEO_LONGUE_MAX_S = 300;
export interface PartieVideo { debut: number; duree: number }

/** « 45 s », « 1 min 05 », « 5 min ». */
export function dureeLisible(secondes: number): string {
  const s = Math.max(0, Math.round(secondes));
  if (s < 60) return `${s} s`;
  return s % 60 ? `${Math.floor(s / 60)} min ${String(s % 60).padStart(2, "0")}` : `${s / 60} min`;
}

/**
 * Les parties d'une vidéo : une seule si elle dure 30 s au plus ; sinon des parties ÉGALES de 30 s au plus
 * (65 s → 22 s + 21 s + 22 s, jamais un petit bout à la fin). Chaque partie devient une story qui démarre
 * au bon moment de la MÊME vidéo (envoyée une seule fois, rien n'est recoupé sur le téléphone).
 */
export function decouperVideo(secondes: unknown): { ok: true; duree: number; parties: PartieVideo[] } | { ok: false; erreur: string } {
  const d = typeof secondes === "number" ? Math.round(secondes) : NaN;
  if (!Number.isFinite(d) || d < 1) return { ok: false, erreur: "Vidéo illisible." };
  if (d > VIDEO_LONGUE_MAX_S) {
    return { ok: false, erreur: `Vidéo trop longue (${dureeLisible(d)}) : ${dureeLisible(VIDEO_LONGUE_MAX_S)} au plus (${Math.ceil(VIDEO_LONGUE_MAX_S / DUREE_STORY_MAX_S)} stories de ${DUREE_STORY_MAX_S} s).` };
  }
  const n = Math.ceil(d / DUREE_STORY_MAX_S);
  const parties: PartieVideo[] = [];
  for (let k = 0; k < n; k++) {
    const debut = Math.round((k * d) / n);
    parties.push({ debut, duree: Math.round(((k + 1) * d) / n) - debut });
  }
  return { ok: true, duree: d, parties };
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

/**
 * Ordre de la barre de stories : l'équipe d'abord (comme demandé : « l'enseignante toujours en premier »).
 *  0 · moi, si je fais partie de l'équipe ;
 *  1 · MES enseignantes (celles de mes cours), dans l'ordre donné ;
 *  2 · le reste de l'équipe ;
 *  3 · moi (élève) ;
 *  4 · les autres : stories pas encore vues d'abord, puis les plus récentes.
 * `ids` peut contenir `meId` même sans story (bulle « Ma story + »).
 */
export function ordreBarre(ids: string[], parPersonne: Map<string, StoryVue[]>, opts: {
  meId: string | null; moiEquipe: boolean; enseignantes: string[]; vues: Set<string>;
}): string[] {
  const rang = (id: string) => {
    if (id === opts.meId) return opts.moiEquipe ? 0 : 3;
    if (opts.enseignantes.includes(id)) return 1;
    return parPersonne.get(id)?.[0]?.equipe ? 2 : 4;
  };
  const nonVue = (id: string) => (parPersonne.get(id) ?? []).some((s) => !opts.vues.has(s.id));
  const recente = (id: string) => (parPersonne.get(id) ?? []).reduce((m, s) => (s.createdAt > m ? s.createdAt : m), "");
  return [...new Set(ids)].sort((a, b) => rang(a) - rang(b)
    || (rang(a) === 1 ? opts.enseignantes.indexOf(a) - opts.enseignantes.indexOf(b) : 0)
    || Number(nonVue(b)) - Number(nonVue(a))
    || recente(b).localeCompare(recente(a)));
}

/** « il y a 3 h », « il y a 12 min ». */
export function ilYa(iso: string, maintenant: Date): string {
  const min = Math.max(0, Math.round((maintenant.getTime() - new Date(iso).getTime()) / 60_000));
  if (min < 1) return "à l'instant";
  if (min < 60) return `il y a ${min} min`;
  return `il y a ${Math.round(min / 60)} h`;
}
