"use server";

/**
 * Vérifie un code promo AVANT l'inscription, pour afficher la remise et le total
 * à payer. Le calcul est fait par le moteur de coupons d'Arazzo OS (source de
 * vérité, server-side) via `POST /v1/public/coupons/validate` — on ne fait jamais
 * confiance au prix du navigateur. Aucune synchro nécessaire : appel temps réel.
 *
 * Renvoie `{ ok, result }` où `result` = { valid, discount?:{discount, amount_after,
 * currency}, message? }. Best-effort : si l'OS est injoignable, on le dit.
 */
export async function validateOnlineCoupon(input: {
  code: string; slug: string; amount?: number | null; email?: string; phone?: string;
}) {
  const base = (process.env.ARAZZO_OS_URL || "").replace(/\/$/, "");
  const code = String(input.code || "").trim();
  if (!base) return { ok: false as const, error: "Vérification indisponible." };
  if (!code) return { ok: false as const, error: "Entrez un code." };

  const controller = new AbortController();
  const minuteur = setTimeout(() => controller.abort(), 6000);
  try {
    const res = await fetch(`${base}/v1/public/coupons/validate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        code,
        scope: "formation_online",
        slug: input.slug || null,
        amount: input.amount ?? null,
        email: input.email || null,
        phone: input.phone || null,
      }),
    });
    const j = await res.json().catch(() => null);
    const result = (j && (j.data ?? j)) || { valid: false, message: "Code invalide." };
    return { ok: true as const, result };
  } catch {
    return { ok: false as const, error: "Vérification impossible. Réessayez." };
  } finally {
    clearTimeout(minuteur);
  }
}
