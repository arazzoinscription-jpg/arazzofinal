-- ─── CODE PROMO SUR LA LANDING EN LIGNE ─────────────────────────────────────
--
-- La landing des formations en ligne affiche désormais une case « code promo /
-- cadeau » (comme sur l'OS). Le code saisi est capturé et stocké avec la demande
-- d'enrôlement pour que l'école honore la remise (la validation Live/coupon reste
-- gérée dans Arazzo OS). Simple ajout de colonne, sans rien casser.

ALTER TABLE public.enrollment_requests
  ADD COLUMN IF NOT EXISTS coupon_code text;
