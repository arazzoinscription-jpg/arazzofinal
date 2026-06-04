import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { InvoiceButton } from "./invoice-button";

export const metadata = { title: "Mes commandes — Arazzo" };
export const dynamic = "force-dynamic";

const STATUS: Record<string, { label: string; cls: string }> = {
  pending: { label: "En attente", cls: "bg-gray-100 text-gray-600" },
  payment_pending: { label: "Paiement en attente", cls: "bg-yellow-100 text-yellow-700" },
  payment_review: { label: "Vérification preuve", cls: "bg-blue-100 text-blue-700" },
  confirmed: { label: "Confirmée", cls: "bg-green-100 text-green-700" },
  shipped: { label: "Expédiée", cls: "bg-orange-100 text-orange-600" },
  delivered: { label: "Livrée", cls: "bg-green-100 text-green-700" },
  cancelled: { label: "Annulée", cls: "bg-red-100 text-red-700" },
  refunded: { label: "Remboursée", cls: "bg-gray-100 text-gray-600" },
};
const fmt = (n: number) => `${Number(n).toLocaleString("fr-DZ")} DA`;
const CONFIRMED = ["confirmed", "shipped", "delivered"];

export default async function MesCommandesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: orders } = await supabase
    .from("orders")
    .select("id, order_number, status, total, payment_method, created_at, order_items(id, title, quantity), invoices(id)")
    .eq("customer_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div>
      <h1 className="font-playfair text-3xl font-bold text-gray-900 mb-6">Mes commandes</h1>

      {!orders?.length ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-cream-200">
          <div className="text-6xl mb-4">📦</div>
          <p className="text-xl text-gray-400 mb-4">Aucune commande pour le moment</p>
          <Link href="/boutique" className="inline-block bg-orange-DEFAULT text-white px-6 py-3 rounded-xl font-semibold hover:bg-orange-600">Découvrir la boutique</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((o) => {
            const st = STATUS[o.status] ?? STATUS.pending;
            const items = (o.order_items as any[]) ?? [];
            const invoice = ((o.invoices as any[]) ?? [])[0];
            return (
              <div key={o.id} className="bg-white rounded-2xl border border-cream-200 p-5">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <p className="font-semibold text-gray-900 font-dm">{o.order_number}</p>
                    <p className="text-xs text-gray-400 font-dm">
                      {new Date(o.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${st.cls}`}>{st.label}</span>
                </div>

                <div className="text-sm text-gray-500 font-dm mt-2">
                  {items.map((it) => `${it.title} ×${it.quantity}`).join(", ")}
                </div>

                <div className="flex items-center justify-between border-t border-cream-100 pt-3 mt-3">
                  <span className="font-bold text-orange-600 font-playfair">{fmt(o.total)}</span>
                  <div className="flex items-center gap-4">
                    {CONFIRMED.includes(o.status) && (
                      invoice ? <InvoiceButton invoiceId={invoice.id} /> : <InvoiceButton orderId={o.id} />
                    )}
                    <Link href={`/confirmation/${o.id}`} className="text-sm font-semibold text-gray-600 hover:text-orange-600 hover:underline">Détail →</Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
