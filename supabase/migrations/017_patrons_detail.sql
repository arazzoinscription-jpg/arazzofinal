-- 017 — Fiche produit patron enrichie (galerie, conseils, vidéo démo, formation liée)
ALTER TABLE public.patrons
  ADD COLUMN IF NOT EXISTS images    TEXT[] NOT NULL DEFAULT '{}',          -- galerie photos
  ADD COLUMN IF NOT EXISTS video_url TEXT,                                  -- vidéo démonstrative (couture du modèle)
  ADD COLUMN IF NOT EXISTS conseils  TEXT,                                  -- conseils : comment traiter/coudre le patron
  ADD COLUMN IF NOT EXISTS course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL; -- formation de référence

CREATE INDEX IF NOT EXISTS idx_patrons_course ON public.patrons(course_id);
