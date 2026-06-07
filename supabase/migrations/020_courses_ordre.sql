-- 020 — Ordre d'affichage des cours + organisation du Niveau 1 (modules « المحور 1 → 12 »)
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS ordre INTEGER;

-- Numérote les modules « المحور N » selon N (1..12) et les place en Niveau 1 (débutant)
UPDATE public.courses
SET ordre  = (substring(titre_ar from 'المحور[[:space:]]*([0-9]+)'))::int,
    niveau = 'debutant'
WHERE titre_ar LIKE 'المحور%'
  AND substring(titre_ar from 'المحور[[:space:]]*([0-9]+)') IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_courses_ordre ON public.courses(ordre);
