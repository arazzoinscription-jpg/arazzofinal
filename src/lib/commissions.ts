import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

type Admin = ReturnType<typeof createAdminClient>;

/** Taux de commission de la plateforme (en %, ex. 30). Défaut 30 si non configuré. */
export async function getCommissionRate(admin: Admin): Promise<number> {
  const { data } = await admin.from("platform_config").select("commission_rate").eq("id", 1).maybeSingle();
  const r = Number((data as { commission_rate?: number } | null)?.commission_rate);
  return Number.isFinite(r) ? r : 30;
}

/** Taux de commission appliqué aux FORMATIONS (en %, ex. 30). Défaut 30. */
export async function getFormateurCommissionRate(admin: Admin): Promise<number> {
  const { data } = await admin.from("platform_config").select("formateur_commission_rate").eq("id", 1).maybeSingle();
  const r = Number((data as { formateur_commission_rate?: number } | null)?.formateur_commission_rate);
  return Number.isFinite(r) ? r : 30;
}

/**
 * Date de départ des gains (YYYY-MM-DD) ou null. Les paiements ANTÉRIEURS à
 * cette date comptent 0 DA dans les calculs de gains / CA.
 */
export async function getGainsStartDate(admin: Admin): Promise<string | null> {
  const { data } = await admin.from("platform_config").select("gains_start_date").eq("id", 1).maybeSingle();
  const d = (data as { gains_start_date?: string | null } | null)?.gains_start_date;
  return d ? String(d) : null;
}

/** Vrai si la date de paiement compte pour les gains (>= date de départ, ou pas de date). */
export function countsForGains(paidAt: string | null | undefined, startDate: string | null): boolean {
  if (!startDate) return true;
  if (!paidAt) return false;
  return String(paidAt).slice(0, 10) >= startDate;
}

/** Gain net pour un prix donné = prix × (1 − taux). */
export function netForPrice(price: number, ratePct: number): number {
  return Math.round((Number(price) || 0) * (1 - (ratePct || 0) / 100));
}

export interface PatronEarning {
  id: string;
  titre: string;
  prix: number;
  sales: number;
  gross: number;       // prix × ventes
  commission: number;  // part plateforme
  net: number;         // gain patronniste
}
export interface SurMesureEarning {
  id: string;
  titre: string;
  prix: number;
  commission: number;
  net: number;
  date: string;
}
export interface PatronnisteEarnings {
  rate: number;
  patrons: PatronEarning[];
  surMesure: SurMesureEarning[];
  totals: { gross: number; commission: number; net: number; sales: number };
}

/**
 * Détail des gains d'un patronniste : ses patrons vendus (boutique) + ses
 * commandes sur-mesure terminées. Calculé à la volée avec le taux courant.
 */
export async function getPatronnisteEarnings(admin: Admin, patronnisteId: string): Promise<PatronnisteEarnings> {
  const rate = await getCommissionRate(admin);
  const gainsStart = await getGainsStartDate(admin);

  // ── Patrons créés par ce patronniste + nombre de ventes ──
  const { data: patrons } = await admin
    .from("patrons")
    .select("id, titre, prix_dzd")
    .eq("formateur_id", patronnisteId);

  const patronIds = (patrons ?? []).map((p) => p.id);
  const salesByPatron = new Map<string, number>();
  if (patronIds.length) {
    const { data: purchases } = await admin
      .from("patron_purchases")
      .select("patron_id, paid_at")
      .in("patron_id", patronIds);
    for (const pu of purchases ?? []) {
      // Gains à partir de la date de départ : les ventes antérieures comptent 0.
      if (!countsForGains((pu as { paid_at?: string | null }).paid_at, gainsStart)) continue;
      if (pu.patron_id) salesByPatron.set(pu.patron_id, (salesByPatron.get(pu.patron_id) ?? 0) + 1);
    }
  }

  const patronRows: PatronEarning[] = (patrons ?? []).map((p) => {
    const prix = Number(p.prix_dzd) || 0;
    const sales = salesByPatron.get(p.id) ?? 0;
    const gross = prix * sales;
    const net = netForPrice(prix, rate) * sales;
    return { id: p.id, titre: p.titre ?? "Patron", prix, sales, gross, commission: gross - net, net };
  });

  // ── Commandes sur-mesure terminées (payées) prises par ce patronniste ──
  const { data: orders } = await admin
    .from("patron_custom_orders")
    .select("id, titre, proposed_price_dzd, paid_at, created_at")
    .eq("patronniste_id", patronnisteId)
    .eq("statut", "completed");

  const surMesureRows: SurMesureEarning[] = (orders ?? [])
    .filter((o) => countsForGains((o as { paid_at?: string | null }).paid_at ?? (o as { created_at?: string }).created_at, gainsStart))
    .map((o) => {
      const prix = Number(o.proposed_price_dzd) || 0;
      const net = netForPrice(prix, rate);
      return { id: o.id, titre: o.titre ?? "Sur mesure", prix, commission: prix - net, net, date: o.paid_at ?? o.created_at };
    });

  // ── Totaux ──
  const all = [...patronRows.map((p) => ({ gross: p.gross, net: p.net, sales: p.sales })),
               ...surMesureRows.map((s) => ({ gross: s.prix, net: s.net, sales: 1 }))];
  const gross = all.reduce((s, r) => s + r.gross, 0);
  const net = all.reduce((s, r) => s + r.net, 0);
  const sales = all.reduce((s, r) => s + r.sales, 0);
  const totals = { gross, net, commission: gross - net, sales };

  return { rate, patrons: patronRows, surMesure: surMesureRows, totals };
}

export interface FormateurCourseEarning {
  id: string;
  titre: string;
  prixDzd: number;
  sales: number;
  grossDzd: number;
  grossEur: number;
  netDzd: number;
  netEur: number;
}
export interface FormateurEarnings {
  rate: number;
  courses: FormateurCourseEarning[];
  totals: { grossDzd: number; grossEur: number; netDzd: number; netEur: number; commissionDzd: number; commissionEur: number; sales: number };
}

/**
 * Détail des gains d'un formateur : ses formations + inscriptions payées.
 * Le revenu vient de `enrollments.amount` (par devise), comme la page stats.
 * Gain net = montant payé × (1 − taux formateur). Calcul à la volée.
 */
export async function getFormateurEarnings(admin: Admin, formateurId: string): Promise<FormateurEarnings> {
  const rate = await getFormateurCommissionRate(admin);
  const gainsStart = await getGainsStartDate(admin);

  const { data: courses } = await admin
    .from("courses")
    .select("id, titre_fr, prix_dzd")
    .eq("formateur_id", formateurId);

  const courseIds = (courses ?? []).map((c) => c.id);
  const agg = new Map<string, { sales: number; grossDzd: number; grossEur: number }>();
  if (courseIds.length) {
    const { data: enrolls } = await admin
      .from("enrollments")
      .select("course_id, amount, currency, paid_at")
      .in("course_id", courseIds);
    for (const e of enrolls ?? []) {
      const cid = e.course_id as string;
      if (!cid) continue;
      // Gains à partir de la date de départ : les inscriptions antérieures comptent 0.
      if (!countsForGains((e as { paid_at?: string | null }).paid_at, gainsStart)) continue;
      const cur = agg.get(cid) ?? { sales: 0, grossDzd: 0, grossEur: 0 };
      cur.sales += 1;
      const amt = Number(e.amount) || 0;
      if (e.currency === "EUR") cur.grossEur += amt; else cur.grossDzd += amt;
      agg.set(cid, cur);
    }
  }

  const courseRows: FormateurCourseEarning[] = (courses ?? []).map((c) => {
    const a = agg.get(c.id) ?? { sales: 0, grossDzd: 0, grossEur: 0 };
    return {
      id: c.id, titre: c.titre_fr ?? "Formation", prixDzd: Number(c.prix_dzd) || 0,
      sales: a.sales, grossDzd: a.grossDzd, grossEur: a.grossEur,
      netDzd: netForPrice(a.grossDzd, rate), netEur: netForPrice(a.grossEur, rate),
    };
  });

  const totals = courseRows.reduce(
    (t, r) => ({
      grossDzd: t.grossDzd + r.grossDzd, grossEur: t.grossEur + r.grossEur,
      netDzd: t.netDzd + r.netDzd, netEur: t.netEur + r.netEur,
      commissionDzd: t.commissionDzd + (r.grossDzd - r.netDzd), commissionEur: t.commissionEur + (r.grossEur - r.netEur),
      sales: t.sales + r.sales,
    }),
    { grossDzd: 0, grossEur: 0, netDzd: 0, netEur: 0, commissionDzd: 0, commissionEur: 0, sales: 0 },
  );

  return { rate, courses: courseRows, totals };
}
