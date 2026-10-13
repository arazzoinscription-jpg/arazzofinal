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
  { id: "skyward-symphony",   title: "Skyward Symphony",           url: "/feed-music/advikgam-skyward-symphony-311178.mp3" },
  { id: "cafe-conversation",  title: "Café Conversation",          url: "/feed-music/ai-seven-bgm-cafe-conversation-ai-213690.mp3" },
  { id: "dream-painting",     title: "Dream Painting",             url: "/feed-music/ai-seven-bgm-dream-painting-ai-192126.mp3" },
  { id: "illusory-heart",     title: "Illusory Heart",             url: "/feed-music/ai-seven-bgm-illusory-heart-ai-203558.mp3" },
  { id: "moonlit-shore",      title: "Moonlit Shore",              url: "/feed-music/ai-seven-bgm-moonlit-shore-ai-193399.mp3" },
  { id: "rain-veil",          title: "Rain Veil",                  url: "/feed-music/ai-seven-bgm-rain-veil-ai-192972.mp3" },
  { id: "upbeat-fun",         title: "Upbeat & Fun",               url: "/feed-music/fernscreativecorner-upbeat-amp-fun-for-shorts-under-one-minute-122192.mp3" },
  { id: "ai-music-1",         title: "AI Music",                   url: "/feed-music/juniorsoundays-ai-music-1-252557.mp3" },
  { id: "deep-sea",           title: "Deep Sea",                   url: "/feed-music/marmixer-deep-sea-324392.mp3" },
  { id: "morning-meditation", title: "Morning Meditation",         url: "/feed-music/megisss-morning-meditation-1-457985.mp3" },
  { id: "silk-road",          title: "Silk Road (Orient)",         url: "/feed-music/paoloargento-silk-road-middle-east-travel-music-60-seconds-feat-a-j-thomson-612541.mp3" },
  { id: "spooky-night",       title: "Spooky in the Night",        url: "/feed-music/paoloargento-spooky-in-the-night-60-seconds-feat-aj-thomson-614715.mp3" },
  { id: "crown-of-fire",      title: "Crown of Fire (hip-hop)",    url: "/feed-music/pink_sound-crown-of-fire-hip-hop-version-1-minute-615018.mp3" },
  { id: "pal-yahi",           title: "Pal Yahi (ballade)",         url: "/feed-music/rahulsapkal-pal-yahi-romantic-hindi-love-ballad-ai-generated-479862.mp3" },
  { id: "peaceable-milieu",   title: "Peaceable Milieu",           url: "/feed-music/rolzim-peacable-milieu-297513.mp3" },
  { id: "peaceful-piano",     title: "Piano du matin",             url: "/feed-music/shorts_by_pazuzustudio-peaceful-morning-piano-solo-30s-528689.mp3" },
  { id: "moods-lofi",         title: "Moods Lofi",                 url: "/feed-music/slpbh-moods-lofi-music-ai-no-copyright-music-generated-with-ai-175333.mp3" },
  { id: "firmament",          title: "Firmament",                  url: "/feed-music/soulprodmusic-firmament-beautiful-inspiring-background-music-for-promo-159766.mp3" },
  { id: "general-ai",         title: "General AI",                 url: "/feed-music/the_mountain-general-ai-137025.mp3" },
  { id: "generative-ai",      title: "Generative AI",              url: "/feed-music/the_mountain-generative-ai-133100.mp3" },
  { id: "hiphop-orchestral",  title: "Hip-hop orchestral",         url: "/feed-music/white_records-background-hip-hop-music-for-video-vlogs-orchestral-beat-1-minute-154217.mp3" },
  { id: "relax-meditation",   title: "Relax méditation",           url: "/feed-music/white_records-background-relax-music-for-vlog-video-1-minute-meditation-light-music-156360.mp3" },
  { id: "little-alicia",      title: "Little Alicia (dramatique)", url: "/feed-music/white_records-dramatic-background-music-for-short-videos-1-minute-little-alicia-155718.mp3" },
  { id: "hiphop-epique",      title: "Hip-hop épique",             url: "/feed-music/white_records-epic-background-music-dramatic-hip-hop-for-short-video-1-minute-146248.mp3" },
  { id: "tango-hiphop",       title: "Tango hip-hop",              url: "/feed-music/white_records-funny-hip-hop-tango-for-video-1-minute-background-short-music-149906.mp3" },
  { id: "synthetic-drive",    title: "Synthetic Drive",            url: "/feed-music/white_records-synthetic-drive-synth-house-version-1-minute-616183.mp3" },
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
