-- Migration 007 — Paiements : rédemption atomique de coupon

-- Incrémente used_count seulement si le quota n'est pas dépassé. Retourne true si OK.
CREATE OR REPLACE FUNCTION public.redeem_coupon(p_coupon_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_ok INTEGER;
BEGIN
  UPDATE public.coupons
    SET used_count = used_count + 1
    WHERE id = p_coupon_id
      AND active = TRUE
      AND (expires_at IS NULL OR expires_at > NOW())
      AND (max_uses IS NULL OR used_count < max_uses);
  GET DIAGNOSTICS v_ok = ROW_COUNT;
  RETURN v_ok > 0;
END;
$$;
