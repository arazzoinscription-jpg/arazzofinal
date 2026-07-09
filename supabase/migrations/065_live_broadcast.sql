-- ─────────────────────────────────────────────────────────────────────────────
-- 065 — Passage en direct (live) intégré sur le site, avec audience
-- ─────────────────────────────────────────────────────────────────────────────
-- Étend live_sessions pour un « direct maintenant » (YouTube/Facebook intégré) :
--   • live_url     : lien de la diffusion en direct (YouTube / Facebook)
--   • audience     : 'public' (tous) | 'group' (un groupe) | 'link' (lien secret)
--   • group_id     : le groupe ciblé (si audience = 'group')
--   • access_token : jeton du lien privé (si audience = 'link') / lien de partage
--   • is_live      : diffusion en cours maintenant

ALTER TABLE public.live_sessions
  ADD COLUMN IF NOT EXISTS live_url     TEXT,
  ADD COLUMN IF NOT EXISTS audience     TEXT NOT NULL DEFAULT 'public',
  ADD COLUMN IF NOT EXISTS group_id     UUID REFERENCES public.groups(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS access_token TEXT,
  ADD COLUMN IF NOT EXISTS is_live      BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE public.live_sessions DROP CONSTRAINT IF EXISTS live_sessions_audience_check;
ALTER TABLE public.live_sessions
  ADD CONSTRAINT live_sessions_audience_check CHECK (audience IN ('public', 'group', 'link'));

CREATE INDEX IF NOT EXISTS idx_live_sessions_is_live ON public.live_sessions(is_live) WHERE is_live = TRUE;
CREATE INDEX IF NOT EXISTS idx_live_sessions_token   ON public.live_sessions(access_token);
