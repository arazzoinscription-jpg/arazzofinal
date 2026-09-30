import "server-only";

/**
 * Vérification d'un code promo AUPRÈS D'ARAZZO OS (moteur de coupons, source de
 * vérité), depuis le serveur du LMS.
 *
 * On ne fait JAMAIS confiance au prix ni à la remise envoyés par le navigateur :
 * pour une commande, le serveur redemande le verdict à l'OS et recalcule le total.
 *
 *   - code valide           → { ok: true, discount, amountAfter }
 *   - code refusé (expiré…) → { ok: false, error: <message de l'OS> }
 *   - OS injoignable        → { ok: false, unreachable: true } : on le dit, on
 *     n'accorde PAS la remise en silence et on ne l'ignore pas non plus.
 */

export type CouponVerdict =
  | { ok: true; code: string; discount: number; amountAfter: number }
  | { ok: false; error: string; unreachable?: boolean };

export async function verifierCouponOs(input: {
  code: string;
  slug?: string | null;
  amount: number;
  email?: string | null;
  phone?: string | null;
}): Promise<CouponVerdict> {
  const base = (process.env.ARAZZO_OS_URL || "").replace(/\/$/, "");
  const code = String(input.code || "").trim().toUpperCase();
  if (!code) return { ok: false, error: "Entrez un code." };
  if (!base) return { ok: false, unreachable: true, error: "Vérification du code impossible pour le moment. Réessayez, ou retirez le code." };

  const controller = new AbortController();
  const minuteur = setTimeout(() => controller.abort(), 6000);
  try {
    const res = await fetch(`${base}/v1/public/coupons/validate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      cache: "no-store",
      body: JSON.stringify({
        code,
        scope: "formation_online",
        slug: input.slug || null,
        amount: input.amount,
        email: input.email || null,
        phone: input.phone || null,
      }),
    });
    const j = await res.json().catch(() => null);
    const r = (j && (j.data ?? j)) as {
      valid?: boolean; message?: string;
      discount?: { discount?: number; amount_after?: number } | null;
      coupon?: { code?: string };
    } | null;
    if (!res.ok || !r) {
      return { ok: false, unreachable: !res.ok && res.status >= 500, error: r?.message || "Vérification du code impossible. Réessayez." };
    }
    if (!r.valid) return { ok: false, error: r.message || "Ce code n’est pas valide." };

    // Un coupon valide sans réduction de prix (cadeau, VIP…) : accepté, prix inchangé.
    const remise = Math.max(0, Math.min(Number(r.discount?.discount) || 0, input.amount));
    const apres = r.discount?.amount_after != null ? Number(r.discount.amount_after) : input.amount - remise;
    return { ok: true, code: r.coupon?.code || code, discount: remise, amountAfter: Math.max(0, apres) };
  } catch {
    return { ok: false, unreachable: true, error: "Vérification du code impossible pour le moment. Réessayez, ou retirez le code." };
  } finally {
    clearTimeout(minuteur);
  }
}
