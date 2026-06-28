-- ════════════════════════════════════════════════════════════════════════
-- 045 — Commission formateur (taux séparé, décidé par l'admin)
-- ────────────────────────────────────────────────────────────────────────
-- Même principe que la commission patronniste (044) mais pour les formateurs :
-- l'admin fixe un taux appliqué aux ventes de formations (enrollments payés).
-- Gain formateur = montant payé × (1 − taux). Taux indépendant de celui des
-- patrons → colonne dédiée sur la config singleton.
-- ════════════════════════════════════════════════════════════════════════

alter table public.platform_config
  add column if not exists formateur_commission_rate numeric(5,2) not null default 30
    check (formateur_commission_rate >= 0 and formateur_commission_rate <= 100);
