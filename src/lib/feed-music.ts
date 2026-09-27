// Bibliothèque musicale interne du feed communauté.
//
// Les fichiers vivent dans `public/feed-music/` (musiques LIBRES DE DROITS,
// reprises de votre dossier arazzo-ai-studio/sons — voir le README du dossier).
//
// Pour AJOUTER une musique :
//   1. Placez le fichier (mp3/m4a/ogg) dans  public/feed-music/.
//   2. Ajoutez une entrée ci-dessous : { id, title, url: "/feed-music/<fichier>" }.
//
// N'ajoutez QUE de la vraie musique de fond (pas d'effets sonores type whoosh,
// alarme, applaudissements…). Liste vide = aucune musique n'est ajoutée.

export interface FeedTrack {
  id: string;       // identifiant stable et court
  title: string;    // libellé affiché à l'utilisateur
  url: string;      // chemin public, commence par /feed-music/
}

export const FEED_MUSIC: FeedTrack[] = [
  { id: "motivation",       title: "Motivation",       url: "/feed-music/motivation.mp3" },
  { id: "motivation-douce", title: "Motivation douce", url: "/feed-music/motivation-douce.mp3" },
  { id: "guitare",          title: "Guitare douce",    url: "/feed-music/guitare.mp3" },
  { id: "piano",            title: "Piano",            url: "/feed-music/piano.mp3" },
  { id: "elegant",          title: "Élégant",          url: "/feed-music/elegant.mp3" },
];

/** Retrouve une piste par son URL (pour afficher le titre au rendu). */
export function findTrackByUrl(url: string | null | undefined): FeedTrack | null {
  if (!url) return null;
  return FEED_MUSIC.find((t) => t.url === url) ?? null;
}

/** Valide qu'une URL de musique appartient bien à la bibliothèque (sécurité). */
export function isAllowedMusicUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  return FEED_MUSIC.some((t) => t.url === url);
}

/**
 * Choisit une piste de façon « aléatoire mais STABLE » à partir d'une clé
 * (l'id du média) : chaque vidéo/photo garde toujours la même musique d'un
 * chargement à l'autre, tout en répartissant les morceaux au hasard sur le feed.
 * Renvoie null si la bibliothèque est vide.
 */
export function pickTrackForKey(key: string): FeedTrack | null {
  if (FEED_MUSIC.length === 0) return null;
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return FEED_MUSIC[h % FEED_MUSIC.length];
}
