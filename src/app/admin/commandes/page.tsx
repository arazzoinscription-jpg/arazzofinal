import { getOrdersAdmin } from "@/app/actions/admin/payments";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { createAdminClient } from "@/lib/supabase/admin";
import { OrderStatusControl } from "./status-control";
import { DeleteOrderButton } from "./delete-order";
export const metadata = { title: "Commandes — Admin" };
export const dynamic = "force-dynamic";

interface LineInfo { title: string; formateur: string | null; patronniste: string | null; kind: string }

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

  // Détail des articles : produit + formateur (cours) + patronniste (patron)
  const admin = createAdminClient();
  const orderIds = orders.map((o) => o.id);
  const linesByOrder = new Map<string, LineInfo[]>();
  if (orderIds.length) {
    const { data: items } = await admin
      .from("order_items")
      .select("order_id, title, course:courses(formateur:users(nom)), product:products(type, patron:patrons(formateur:users(nom)))")
      .in("order_id", orderIds);
    for (const it of (items ?? []) as any[]) {
      const arr = linesByOrder.get(it.order_id) ?? [];
      arr.push({
        title: it.title ?? "Article",
        formateur: it.course?.formateur?.nom ?? null,
        patronniste: it.product?.patron?.formateur?.nom ?? null,
        kind: it.product?.type ?? "",
      });
      linesByOrder.set(it.order_id, arr);
    }
  }

  return (
    <div className="px-4 lg:px-8 py-6">
      <h1 className="font-playfair text-3xl font-bold text-gray-900 mb-1">Commandes</h1>
      <p className="text-gray-500 mb-6 font-dm">{orders.length} commande(s).</p>

      {/* Filtres */}
      <form className="flex flex-wrap gap-3 mb-6">
        <input name="q" defaultValue={searchParams.q ?? ""} placeholder="N° commande, nom, email…"
          className="flex-1 min-w-56 border border-gray-100 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-500" />
        <select name="status" defaultValue={searchParams.status ?? ""} className="border border-gray-100 rounded-xl px-4 py-2.5 bg-white">
          <option value="">Tous statuts</option>
          {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select name="method" defaultValue={searchParams.method ?? ""} className="border border-gray-100 rounded-xl px-4 py-2.5 bg-white">
          <option value="">Tous paiements</option>
          {Object.entries(METHOD).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <button className="bg-orange-DEFAULT text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-orange-600">Filtrer</button>
      </form>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-x-auto">
        <Table className="w-full text-sm">
          <TableHeader className="bg-gray-50">
            <TableRow className="text-left text-gray-500 font-dm">
              <TableHead className="px-5 py-3 font-medium">Commande</TableHead>
              <TableHead className="px-5 py-3 font-medium">Produits / Vendeur</TableHead>
              <TableHead className="px-5 py-3 font-medium">Client</TableHead>
              <TableHead className="px-5 py-3 font-medium">Paiement</TableHead>
              <TableHead className="px-5 py-3 font-medium">Total</TableHead>
              <TableHead className="px-5 py-3 font-medium">Statut</TableHead>
              <TableHead className="px-5 py-3 font-medium">Date</TableHead>
              <TableHead className="px-5 py-3 font-medium">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-gray-50">
            {orders.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center py-10 text-gray-400">Aucune commande.</TableCell></TableRow>
            ) : orders.map((o) => {
              const st = STATUS[o.status] ?? STATUS.pending;
              const lines = linesByOrder.get(o.id) ?? [];
              return (
                <TableRow key={o.id} className="hover:bg-gray-50 font-dm align-top">
                  <TableCell className="px-5 py-3 font-semibold text-gray-900">{o.order_number}
                    <span className="block text-xs text-gray-400 font-normal">{(o.order_items as any[])?.length ?? 0} article(s)</span>
                  </TableCell>
                  <TableCell className="px-5 py-3 text-gray-600 max-w-xs">
                    {lines.length === 0 ? <span className="text-gray-300">—</span> : (
                      <div className="space-y-1.5">
                        {lines.map((l, i) => (
                          <div key={i}>
                            <div className="text-gray-800 truncate">{l.title}</div>
                            <div className="text-[11px] text-gray-400">
                              {l.formateur ? <span>👩‍🏫 Formateur : {l.formateur}</span>
                                : l.patronniste ? <span>✂️ Patronniste : {l.patronniste}</span>
                                : <span className="capitalize">{l.kind || "—"}</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="px-5 py-3 text-gray-600">{o.full_name}<span className="block text-xs text-gray-400">{o.email}</span></TableCell>
                  <TableCell className="px-5 py-3 text-gray-600">{METHOD[o.payment_method] ?? "—"}</TableCell>
                  <TableCell className="px-5 py-3 font-semibold text-orange-600">{fmt(o.total)}</TableCell>
                  <TableCell className="px-5 py-3"><span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${st.cls}`}>{st.label}</span></TableCell>
                  <TableCell className="px-5 py-3 text-gray-500 whitespace-nowrap">{new Date(o.created_at).toLocaleDateString("fr-FR")}</TableCell>
                  <TableCell className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <OrderStatusControl orderId={o.id} current={o.status} />
                      <DeleteOrderButton orderId={o.id} orderNumber={o.order_number} />
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
