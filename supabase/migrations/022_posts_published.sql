-- 022 — Validation/publication des actualités
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS published BOOLEAN NOT NULL DEFAULT TRUE;
CREATE INDEX IF NOT EXISTS idx_posts_published ON public.posts(published);
