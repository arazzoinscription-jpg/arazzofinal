// Types & helpers communauté SANS dépendance serveur — importables côté client.
// (Le chargement des données vit dans community.ts, qui importe du code server-only.)

export type SourceType = "admin" | "course_teaser" | "practical" | "patron_demo";

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
};

export function sourceLabel(s: SourceType): string {
  return SOURCE_LABEL[s] ?? "Communauté";
}
