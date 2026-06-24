-- Ajoute un flag pour rendre une formation visible/disponible à l'inscription
ALTER TABLE public.courses
ADD COLUMN IF NOT EXISTS visible_inscription BOOLEAN NOT NULL DEFAULT TRUE;

CREATE INDEX IF NOT EXISTS idx_courses_visible_inscription
ON public.courses(visible_inscription);
