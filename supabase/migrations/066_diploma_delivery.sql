-- ─────────────────────────────────────────────────────────────────────────────
-- 066 — Infos de livraison du diplôme (pour l'export vers la société de livraison)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.diplomas
  ADD COLUMN IF NOT EXISTS phone   TEXT,
  ADD COLUMN IF NOT EXISTS wilaya  TEXT,
  ADD COLUMN IF NOT EXISTS address TEXT;
