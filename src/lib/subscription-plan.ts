/**
 * Calculs purs de l'abonnement (paiement par tranches + découpe des chapitres).
 *
 * Client-safe : AUCUN import serveur ici — ce module est utilisé à la fois par
 * les Server Actions (submitLead, finalize) ET par la page offre (composant
 * client) pour afficher les montants. Le helper DB est dans `subscriptions.ts`
 * (server-only).
 */

/** Nombre de chapitres ouverts par mois : ceil(N / M). Ex 22/4 → 6 (→ 6,6,6,4). */
export function perMonthBatch(totalChapters: number, months: number): number {
  if (months <= 0) return totalChapters;
  return Math.ceil(totalChapters / months);
}

/** Répartition des chapitres par mois. Ex (22, 4) → [6, 6, 6, 4]. */
export function batchSizes(totalChapters: number, months: number): number[] {
  if (months <= 0) return [totalChapters];
  const per = perMonthBatch(totalChapters, months);
  const out: number[] = [];
  let remaining = totalChapters;
  for (let m = 0; m < months; m++) {
    const take = Math.max(0, Math.min(per, remaining));
    out.push(take);
    remaining -= take;
  }
  return out;
}

/**
 * Mois (1-based) auquel s'ouvre le chapitre situé à l'index ordonné `index0`
 * (0-based, trié par `ordre`). Ex index 0..5 → mois 1, 6..11 → mois 2, etc.
 * Borné au nombre de mois (sécurité si plus de chapitres que prévu).
 */
export function unlockMonthForIndex(index0: number, totalChapters: number, months: number): number {
  if (months <= 0) return 1;
  const per = perMonthBatch(totalChapters, months);
  return Math.min(months, Math.floor(index0 / per) + 1);
}

/** Montant d'une tranche mensuelle = prix / nombre de mois (arrondi). */
export function monthlyAmount(prixDzd: number, months: number): number {
  if (months <= 0) return prixDzd;
  return Math.round(prixDzd / months);
}

/**
 * Montant si l'élève paie comptant : un mois offert → prix × (M-1)/M (arrondi).
 * Ex 4 mois à 10 000 → 30 000 au lieu de 40 000.
 */
export function fullDiscountedAmount(prixDzd: number, months: number): number {
  if (months <= 1) return prixDzd;
  return Math.round((prixDzd * (months - 1)) / months);
}
