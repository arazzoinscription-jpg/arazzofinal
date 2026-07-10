-- ─────────────────────────────────────────────────────────────────────────────
-- 068 — Taux de commission INDIVIDUEL par formateur
-- ─────────────────────────────────────────────────────────────────────────────
-- L'admin peut régler les gains de CHAQUE formateur : un taux propre (en %)
-- stocké sur son profil. NULL = le taux global `formateur_commission_rate`
-- de platform_config s'applique (comportement actuel inchangé).

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS formateur_commission_rate NUMERIC
  CHECK (formateur_commission_rate IS NULL OR (formateur_commission_rate >= 0 AND formateur_commission_rate <= 100));
