// Types & helpers communauté SANS dépendance serveur — importables côté client.
// (Le chargement des données vit dans community.ts, qui importe du code server-only.)

export type SourceType = "admin" | "course_teaser" | "practical" | "patron_demo" | "facebook" | "student_reel";

/** Vrai si l'URL pointe vers une vidéo Facebook (facebook.com / fb.watch). */
export function isFacebookVideoUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    const h = new URL(url).hostname.toLowerCase();
    return /(^|\.)facebook\.com$/.test(h) || h === "fb.watch" || h.endsWith(".fb.watch");
  } catch {
    return false;
  }
}

/** Construit la source du lecteur Facebook intégré (aucun téléchargement : la vidéo reste chez Facebook). */
export function facebookEmbedSrc(url: string | null | undefined): string {
  const href = encodeURIComponent(url ?? "");
  return `https://www.facebook.com/plugins/video.php?href=${href}&show_text=false&autoplay=false&allowfullscreen=true`;
}

export interface CommunityItem {
  id: string;            // community_media.id
  postId: string;
  sourceType: SourceType;
  mediaKind: "video" | "image";
  videoHls: string | null;   // si vidéo hébergée Bunny
  mediaUrl: string | null;   // si fichier déjà téléversé réutilisé
  thumbnail: string | null;
  caption: string | null;
  createdAt: string;
  author: { id: string; nom: string; avatar_url: string | null; role: string };
  likeCount: number;
  liked: boolean;
  commentCount: number;
  cta: { label: string; href: string } | null;
}

const SOURCE_LABEL: Record<SourceType, string> = {
  admin: "Arazzo",
  course_teaser: "Formation",
  practical: "Travail d'élève",
  patron_demo: "Patron",
  facebook: "Facebook",
  student_reel: "Reel élève",
};

export function sourceLabel(s: SourceType): string {
  return SOURCE_LABEL[s] ?? "Communauté";
}
