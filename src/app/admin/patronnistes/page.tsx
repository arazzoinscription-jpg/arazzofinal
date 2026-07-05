import { Scissors, MapPin } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCommissionRate, netForPrice, getGainsStartDate, countsForGains } from "@/lib/commissions";
import { CommissionForm } from "./commission-form";

export const metadata = { title: "Patronnistes — Admin" };
export const dynamic = "force-dynamic";

export default async function AdminPatronnistesPage({ searchParams }: { searchParams: { q?: string } }) {
  const admin = createAdminClient();
  const q = (searchParams.q ?? "").trim();

  let query = admin
    .from("users")
    .select("id, nom, email, ville, avatar_url, created_at")
    .contains("roles", ["patronniste"])
    .order("created_at", { ascending: false });
  if (q) query = query.or(`nom.ilike.%${q}%,email.ilike.%${q}%`);
  const { data: patronnistes } = await query.limit(200);

  // Patrons créés par patronniste (patrons.formateur_id = créateur)
  const { data: patrons } = await admin.from("patrons").select("formateur_id");
  const nbPatrons = new Map<string, number>();
  for (const p of patrons ?? []) {
    const id = (p as any).formateur_id as string | null;
    if (id) nbPatrons.set(id, (nbPatrons.get(id) ?? 0) + 1);
  }

  // Commandes sur mesure prises en charge par patronniste
  const { data: orders } = await admin.from("patron_custom_orders").select("patronniste_id");
  const nbOrders = new Map<string, number>();
  for (const o of orders ?? []) {
    const id = (o as any).patronniste_id as string | null;
    if (id) nbOrders.set(id, (nbOrders.get(id) ?? 0) + 1);
  }

  // ── Gains nets par patronniste (taux courant) : patrons vendus + sur-mesure terminés ──
  const rate = await getCommissionRate(admin);
  const gainsStart = await getGainsStartDate(admin);
  const netByPatronniste = new Map<string, number>();
  const { data: patronsPrice } = await admin.from("patrons").select("id, formateur_id, prix_dzd");
  const priceByPatron = new Map<string, { owner: string | null; prix: number }>();
  for (const p of patronsPrice ?? []) priceByPatron.set(p.id, { owner: (p as any).formateur_id ?? null, prix: Number((p as any).prix_dzd) || 0 });
  const { data: allPurchases } = await admin.from("patron_purchases").select("patron_id, paid_at");
  for (const pu of allPurchases ?? []) {
    if (!countsForGains((pu as any).paid_at, gainsStart)) continue; // gains à partir de la date
    const info = pu.patron_id ? priceByPatron.get(pu.patron_id) : null;
    if (info?.owner) netByPatronniste.set(info.owner, (netByPatronniste.get(info.owner) ?? 0) + netForPrice(info.prix, rate));
  }
  const { data: doneOrders } = await admin
    .from("patron_custom_orders").select("patronniste_id, proposed_price_dzd, paid_at, created_at").eq("statut", "completed");
  for (const o of doneOrders ?? []) {
    if (!countsForGains((o as any).paid_at ?? (o as any).created_at, gainsStart)) continue;
    const id = (o as any).patronniste_id as string | null;
    if (id) netByPatronniste.set(id, (netByPatronniste.get(id) ?? 0) + netForPrice(Number((o as any).proposed_price_dzd) || 0, rate));
  }

  return (
    <div className="px-4 lg:px-8 py-6">
      <h1 className="font-playfair text-3xl font-bold text-gray-900 mb-1 flex items-center gap-2">
        <Scissors size={28} className="text-orange-600" /> Patronnistes
      </h1>
      <p className="text-gray-500 mb-6 font-dm">{patronnistes?.length ?? 0} patronniste(s) · commission plateforme {rate}%.</p>

      <CommissionForm rate={rate} />

      <form className="flex gap-3 mb-6">
        <input name="q" defaultValue={q} placeholder="Rechercher un patronniste…"
          className="flex-1 border border-gray-100 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-500" />
        <button className="bg-orange-DEFAULT text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-orange-600">Rechercher</button>
      </form>

      {!patronnistes?.length ? (
        <div className="rounded-2xl bg-white border border-gray-100 p-12 text-center text-gray-400">Aucun patronniste.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {patronnistes.map((p) => (
            <div key={p.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center gap-3 mb-3">
                {p.avatar_url ? (
                  <img src={p.avatar_url} alt={p.nom ?? ""} className="w-12 h-12 rounded-full object-cover" />
                ) : (
                  <span className="w-12 h-12 rounded-full bg-violet-100 text-violet-600 grid place-items-center font-bold">
                    {(p.nom ?? "?").slice(0, 1).toUpperCase()}
                  </span>
                )}
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{p.nom ?? "—"}</p>
                  <p className="text-xs text-gray-400 truncate">{p.email}</p>
                </div>
              </div>
              {p.ville && <p className="text-xs text-gray-500 mb-3 inline-flex items-center gap-1"><MapPin size={12} /> {p.ville}</p>}
              <div className="flex gap-4 text-sm">
                <span className="text-gray-600"><strong className="text-violet-700">{nbPatrons.get(p.id) ?? 0}</strong> patrons</span>
                <span className="text-gray-600"><strong className="text-orange-600">{nbOrders.get(p.id) ?? 0}</strong> sur-mesure</span>
              </div>
              <div className="mt-3 pt-3 border-t border-gray-50">
                <span className="text-xs text-gray-400">Gains nets</span>
                <p className="font-bold text-green-600">{(netByPatronniste.get(p.id) ?? 0).toLocaleString("fr-DZ")} DA</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
