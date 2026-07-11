-- ─────────────────────────────────────────────────────────────────────────────
-- 071 — Preuve Telegram : type de paiement + plusieurs photos
-- ─────────────────────────────────────────────────────────────────────────────
-- L'étudiante précise si elle a payé en TOTALITÉ (une seule photo) ou en
-- ABONNEMENT / tranches (plusieurs photos). `file_paths` stocke toutes les
-- photos ; `file_path` reste la première (compatibilité migration 070).

ALTER TABLE public.telegram_payment_proofs
  ADD COLUMN IF NOT EXISTS payment_type text NOT NULL DEFAULT 'total'
    CHECK (payment_type IN ('total', 'abonnement'));

ALTER TABLE public.telegram_payment_proofs
  ADD COLUMN IF NOT EXISTS file_paths text[] NOT NULL DEFAULT '{}'::text[];
