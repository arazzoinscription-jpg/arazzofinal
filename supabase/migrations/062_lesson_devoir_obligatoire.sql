-- ─────────────────────────────────────────────────────────────────────────────
-- 062 — Devoir de leçon obligatoire (gate du diplôme)
-- ─────────────────────────────────────────────────────────────────────────────
-- • devoir_obligatoire : si TRUE, ce devoir de leçon DOIT être validé (travail
--   pratique approuvé) pour débloquer le diplôme du cours. Défaut FALSE (opt-in) :
--   aucun changement pour l'existant tant que le formateur ne coche rien.
-- • Backfill : chaque leçon SANS devoir reçoit la consigne standard demandée
--   (on ne remplace PAS les devoirs déjà personnalisés par le formateur).

ALTER TABLE public.lessons
  ADD COLUMN IF NOT EXISTS devoir_obligatoire BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_lessons_devoir_obligatoire
  ON public.lessons(devoir_obligatoire) WHERE devoir_obligatoire = TRUE;

UPDATE public.lessons
SET devoir = 'Résumer le cours + dessiner le patron + vidéo de montage d''une pièce.'
WHERE devoir IS NULL OR btrim(devoir) = '';
