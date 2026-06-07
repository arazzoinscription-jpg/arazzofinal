import { getOrdersAdmin } from "@/app/actions/admin/payments";
import { OrderStatusControl } from "./status-control";

export const metadata = { title: "Commandes — Admin" };
export const dynamic = "force-dynamic";

const STATUS: Record<string, { label: string; cls: string }> = {
  pending: { label: "En attente", cls: "bg-gray-100 text-gray-600" },
  payment_pending: { label: "Paiement attendu", cls: "bg-yellow-100 text-yellow-700" },
  payment_review: { label: "Vérification", cls: "bg-blue-100 text-blue-700" },
  confirmed: { label: "Confirmée", cls: "bg-green-100 text-green-700" },
  shipped: { label: "Expédiée", cls: "bg-orange-100 text-orange-600" },
  delivered: { label: "Livrée", cls: "bg-green-100 text-green-700" },
  cancelled: { label: "Annulée", cls: "bg-red-100 text-red-700" },
  refunded: { label: "Remboursée", cls: "bg-gray-100 text-gray-600" },
};
const METHOD: Record<string, string> = { ccp: "CCP", paypal: "PayPal", cod: "Livraison", transfer: "Virement" };
const fmt = (n: number) => `${Number(n).toLocaleString("fr-DZ")} DA`;

export default async function AdminCommandesPage({ searchParams }: { searchParams: { status?: string; method?: string; q?: string } }) {
  const res = await getOrdersAdmin({ status: searchParams.status, paymentMethod: searchParams.method, q: searchParams.q });
  const orders = (res.ok ? res.orders : []) as any[];

  return (
    <div className="max-w-6xl mx-auto p-8">
      <h1 className="font-playfair text-3xl font-bold text-gray-900 mb-1">Commandes</h1>
      <p className="text-gray-500 mb-6 font-dm">{orders.length} commande(s).</p>

      {/* Filtres */}
      <form className="flex flex-wrap gap-3 mb-6">
        <input name="q" defaultValue={searchParams.q ?? ""} placeholder="N° commande, nom, email…"
          className="flex-1 min-w-56 border border-cream-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-500" />
        <select name="status" defaultValue={searchParams.status ?? ""} className="border border-cream-200 rounded-xl px-4 py-2.5 bg-white">
          <option value="">Tous statuts</option>
          {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select name="method" defaultValue={searchParams.method ?? ""} className="border border-cream-200 rounded-xl px-4 py-2.5 bg-white">
          <option value="">Tous paiements</option>
          {Object.entries(METHOD).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <button className="bg-orange-DEFAULT text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-orange-600">Filtrer</button>
      </form>

      <div className="bg-white rounded-2xl border border-cream-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-cream-50">
            <tr className="text-left text-gray-500 font-dm">
              <th className="px-5 py-3 font-medium">Commande</th>
              <th className="px-5 py-3 font-medium">Client</th>
              <th className="px-5 py-3 font-medium">Paiement</th>
              <th className="px-5 py-3 font-medium">Total</th>
              <th className="px-5 py-3 font-medium">Statut</th>
              <th className="px-5 py-3 font-medium">Date</th>
              <th className="px-5 py-3 font-medium">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-cream-100">
            {orders.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-10 text-gray-400">Aucune commande.</td></tr>
            ) : orders.map((o) => {
              const st = STATUS[o.status] ?? STATUS.pending;
              return (
                <tr key={o.id} className="hover:bg-cream-50 font-dm">
                  <td className="px-5 py-3 font-semibold text-gray-900">{o.order_number}
                    <span className="block text-xs text-gray-400 font-normal">{(o.order_items as any[])?.length ?? 0} article(s)</span>
                  </td>
                  <td className="px-5 py-3 text-gray-600">{o.full_name}<span className="block text-xs text-gray-400">{o.email}</span></td>
                  <td className="px-5 py-3 text-gray-600">{METHOD[o.payment_method] ?? "—"}</td>
                  <td className="px-5 py-3 font-semibold text-orange-600">{fmt(o.total)}</td>
                  <td className="px-5 py-3"><span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${st.cls}`}>{st.label}</span></td>
                  <td className="px-5 py-3 text-gray-500 whitespace-nowrap">{new Date(o.created_at).toLocaleDateString("fr-FR")}</td>
                  <td className="px-5 py-3"><OrderStatusControl orderId={o.id} current={o.status} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
