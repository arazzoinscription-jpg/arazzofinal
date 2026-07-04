-- ════════════════════════════════════════════════════════════════════════
-- 054 — Date de départ des GAINS (remise à zéro de la comptabilité)
-- ────────────────────────────────────────────────────────────────────────
-- L'admin fixe une date : les paiements ANTÉRIEURS à cette date comptent 0 DA
-- dans les calculs de gains / CA (formateurs, patronnistes, tableaux de bord).
-- NULL = aucune remise à zéro (tout est compté, comportement historique).
-- ════════════════════════════════════════════════════════════════════════

ALTER TABLE public.platform_config
  ADD COLUMN IF NOT EXISTS gains_start_date DATE;

-- ════════════════════════════════════════════════════════════════════════
-- Fin de la migration 054_gains_start_date
-- ════════════════════════════════════════════════════════════════════════
