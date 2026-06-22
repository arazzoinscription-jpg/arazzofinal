-- 027 — Devoirs (« homework ») par cours + récompense d'accès à l'Atelier
-- À exécuter dans Supabase → SQL Editor (ou via `supabase db push`).
-- Deux ajouts non destructifs sur la table `courses` :
--   • homework         : la consigne saisie par le formateur (« ce qu'il faut faire »)
--   • atelier_required : si TRUE, ce cours fait partie des cours à terminer
--                        pour débloquer le tableau de bord « Atelier ».

ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS homework TEXT;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS atelier_required BOOLEAN NOT NULL DEFAULT FALSE;

-- Index pour retrouver rapidement les cours requis pour l'Atelier.
CREATE INDEX IF NOT EXISTS idx_courses_atelier_required
  ON public.courses(atelier_required) WHERE atelier_required = TRUE;
