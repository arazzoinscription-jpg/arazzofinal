-- 036 — Titres & descriptions des cours en anglais (i18n FR/AR/EN)
-- Le site a 3 langues mais `courses` n'avait que FR + AR → l'anglais affichait le français.
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS titre_en       TEXT;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS description_en TEXT;
