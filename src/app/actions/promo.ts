"use server";

import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { validateCoupon } from "@/lib/coupons";
import { getCart } from "./cart";

const COOKIE = "promo";
const MAX_AGE = 60 * 60 * 24 * 7; // 7 jours

export interface PromoView {
  code: string;
  discount: number;
  final: number;
}

/** Applique un code promo au panier courant (le mémorise via cookie). */
export async function applyPromo(code: string) {
  const clean = (code ?? "").trim();
  if (!clean) return { ok: false as const, error: "Entrez un code." };

  const { subtotal } = await getCart();
  if (subtotal <= 0) return { ok: false as const, error: "Votre panier est vide." };

  const admin = createAdminClient();
  const res = await validateCoupon(admin, clean, subtotal);
  if (!res.valid) return { ok: false as const, error: res.reason ?? "Code invalide." };

  (await cookies()).set(COOKIE, res.code!, { httpOnly: true, sameSite: "lax", maxAge: MAX_AGE, path: "/" });
  return { ok: true as const, code: res.code!, discount: res.discount!, final: res.final! };
}

/** Retire le code promo appliqué. */
export async function removePromo() {
  (await cookies()).delete(COOKIE);
  return { ok: true as const };
}

/** Renvoie le promo appliqué revalidé sur le sous-total actuel (ou null). */
export async function getAppliedPromo(): Promise<PromoView | null> {
  const code = (await cookies()).get(COOKIE)?.value;
  if (!code) return null;
  const { subtotal } = await getCart();
  if (subtotal <= 0) return null;
  const admin = createAdminClient();
  const res = await validateCoupon(admin, code, subtotal);
  if (!res.valid) return null;
  return { code: res.code!, discount: res.discount!, final: res.final! };
}
