-- ─────────────────────────────────────────────────────────────────────────────
-- 076 — Date de validation d'un travail pratique
-- ─────────────────────────────────────────────────────────────────────────────
-- `reviewed_at` = moment où le formateur valide/corrige le travail. Permet de
-- trier « À partager sur le feed » par validation RÉCENTE (et non par date de
-- soumission) → un travail validé apparaît tout en haut, immédiatement visible.

ALTER TABLE public.lesson_practicals
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;

-- Backfill : les travaux déjà validés/corrigés prennent leur date de soumission.
UPDATE public.lesson_practicals
SET reviewed_at = created_at
WHERE reviewed_at IS NULL AND status IN ('approved', 'reviewed');

CREATE INDEX IF NOT EXISTS idx_lp_reviewed_at ON public.lesson_practicals(reviewed_at DESC);
