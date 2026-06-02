import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface CouponResult {
  valid: boolean;
  reason?: string;
  couponId?: string;
  code?: string;
  type?: "percent" | "fixed";
  value?: number;
  discount?: number;
  final?: number;
}

/**
 * Valide un coupon et calcule la remise sur un montant donné.
 * Lecture via un client admin (RLS coupons = staff seulement).
 */
export async function validateCoupon(
  admin: SupabaseClient,
  code: string,
  amount: number
): Promise<CouponResult> {
  const clean = code.trim().toUpperCase();
  if (!clean) return { valid: false, reason: "Code vide." };

  const { data: c } = await admin
    .from("coupons")
    .select("id, code, type, value, max_uses, used_count, expires_at, active")
    .ilike("code", clean)
    .maybeSingle();

  if (!c) return { valid: false, reason: "Code inconnu." };
  if (!c.active) return { valid: false, reason: "Coupon désactivé." };
  if (c.expires_at && new Date(c.expires_at).getTime() < Date.now())
    return { valid: false, reason: "Coupon expiré." };
  if (c.max_uses != null && c.used_count >= c.max_uses)
    return { valid: false, reason: "Coupon épuisé." };

  const discount = c.type === "percent"
    ? Math.round((amount * Number(c.value)) / 100)
    : Math.min(Number(c.value), amount);
  const final = Math.max(0, amount - discount);

  return {
    valid: true, couponId: c.id, code: c.code,
    type: c.type, value: Number(c.value), discount, final,
  };
}
