// Types partagés des composants de fil d'actualités (feed global + groupes).

export interface FeedAuthor {
  id?: string;
  nom: string;
  role: string;
  avatar_url: string | null;
}

export interface FeedImage {
  image_url: string | null;
  expired: boolean;
}

export interface FeedComment {
  id: string;
  content: string;
  created_at: string;
  author_id: string;
  author: FeedAuthor;
}

export interface FeedPost {
  id: string;
  content: string | null;
  created_at: string;
  author_id: string;
  author: FeedAuthor;
  images: FeedImage[];
  likeCount: number;
  liked: boolean;
  comments: FeedComment[];
  published?: boolean;
}

export interface CurrentUser {
  id: string;
  role: string;
}

/** Libellé lisible du rôle. */
export function roleLabel(role: string): string {
  if (role === "formateur") return "Prof";
  if (role === "admin") return "Admin";
  return "Étudiant";
}
