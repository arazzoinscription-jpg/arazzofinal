import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

type Admin = ReturnType<typeof createAdminClient>;

/** Taux de commission de la plateforme (en %, ex. 30). Défaut 30 si non configuré. */
export async function getCommissionRate(admin: Admin): Promise<number> {
  const { data } = await admin.from("platform_config").select("commission_rate").eq("id", 1).maybeSingle();
  const r = Number((data as { commission_rate?: number } | null)?.commission_rate);
  return Number.isFinite(r) ? r : 30;
}

/** Gain net du patronniste pour un prix donné = prix × (1 − taux). */
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
      .select("patron_id")
      .in("patron_id", patronIds);
    for (const pu of purchases ?? []) {
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

  const surMesureRows: SurMesureEarning[] = (orders ?? []).map((o) => {
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
