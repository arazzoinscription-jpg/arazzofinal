-- ─── MUSIQUE DE FOND DES VIDÉOS COMMUNAUTÉ ──────────────────────────────────
--
-- Permet d'attacher une piste musicale (issue de la bibliothèque interne du
-- site, servie depuis /feed-music/…) à une vidéo publiée dans le feed.
-- La piste est lue en boucle par-dessus la vidéo dans le lecteur ; la vidéo est
-- jouée en muet quand une musique est présente (le son vient de la musique).
--
-- Deux colonnes seulement, optionnelles (NULL = pas de musique, comportement
-- inchangé pour toutes les vidéos existantes) :
--   music_url    URL de la piste (ex. /feed-music/douce.mp3).
--   music_title  libellé affiché (facultatif).

ALTER TABLE public.community_media
  ADD COLUMN IF NOT EXISTS music_url   text,
  ADD COLUMN IF NOT EXISTS music_title text;
