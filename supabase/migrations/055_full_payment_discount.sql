-- ════════════════════════════════════════════════════════════════════════
-- 055 — Remise « 1 mois offert » au paiement comptant : activable par formation
-- ────────────────────────────────────────────────────────────────────────
-- Par défaut, une formation/pack en abonnement offre 1 mois au paiement comptant
-- (prix × (M-1)/M). Exception (ex. Niveau 1) : désactiver la remise → le comptant
-- reste au PRIX PLEIN. TRUE = remise appliquée (défaut) ; FALSE = pas de remise.
-- ════════════════════════════════════════════════════════════════════════

ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS full_payment_discount BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE public.course_packs
  ADD COLUMN IF NOT EXISTS full_payment_discount BOOLEAN NOT NULL DEFAULT TRUE;

-- ════════════════════════════════════════════════════════════════════════
-- Fin de la migration 055_full_payment_discount
-- ════════════════════════════════════════════════════════════════════════
