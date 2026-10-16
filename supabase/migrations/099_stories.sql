-- ═══════════════════════════════════════════════════════════════════════════
-- 099 — STORIES (photo ou vidéo de 30 s, visibles 24 h)
-- ───────────────────────────────────────────────────────────────────────────
-- Élèves ET enseignantes ajoutent une story : un anneau coloré apparaît autour
-- de leur photo de profil (profil communauté, Ma classe) ; un clic l'ouvre.
-- Photo : stockage « posts » (dossier stories/) ; vidéo : Bunny Stream.
-- Les stories expirées ne sont plus lues (filtre expires_at > now()).
-- Aucune donnée existante n'est modifiée. Se rejoue sans dommage.
--
-- Retour arrière : DROP TABLE IF EXISTS public.stories;
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.stories (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  media_kind       TEXT NOT NULL CHECK (media_kind IN ('image', 'video')),
  media_url        TEXT,
  storage_path     TEXT,
  bunny_video_id   TEXT,
  thumbnail_url    TEXT,
  duration_seconds INTEGER CHECK (duration_seconds IS NULL OR duration_seconds BETWEEN 1 AND 30),
  legende          TEXT CHECK (legende IS NULL OR char_length(legende) <= 150),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at       TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
  CONSTRAINT stories_media CHECK (media_url IS NOT NULL OR bunny_video_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS stories_actives_idx ON public.stories (user_id, expires_at DESC);
CREATE INDEX IF NOT EXISTS stories_expiration_idx ON public.stories (expires_at);

-- Lecture / écriture par le serveur uniquement (clé de service) : aucun accès direct.
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;
