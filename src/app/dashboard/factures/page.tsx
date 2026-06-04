import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { InvoiceButton } from "../commandes/invoice-button";

export const metadata = { title: "Mes factures — Arazzo" };
export const dynamic = "force-dynamic";

const fmt = (n: number) => `${Number(n).toLocaleString("fr-DZ")} DA`;

export default async function MesFacturesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: invoices } = await supabase
    .from("invoices")
    .select("id, invoice_number, amount, issued_at, order:orders(order_number)")
    .eq("customer_id", user.id)
    .order("issued_at", { ascending: false });

  return (
    <div>
      <h1 className="font-playfair text-3xl font-bold text-gray-900 mb-6">Mes factures</h1>

      {!invoices?.length ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-cream-200">
          <div className="text-6xl mb-4">🧾</div>
          <p className="text-xl text-gray-400">Aucune facture pour le moment</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-cream-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-cream-50">
              <tr className="text-left text-gray-500 font-dm">
                <th className="px-5 py-3 font-medium">Facture</th>
                <th className="px-5 py-3 font-medium">Commande</th>
                <th className="px-5 py-3 font-medium">Date</th>
                <th className="px-5 py-3 font-medium">Montant</th>
                <th className="px-5 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-100">
              {invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-cream-50 font-dm">
                  <td className="px-5 py-3 font-semibold text-gray-900">{inv.invoice_number}</td>
                  <td className="px-5 py-3 text-gray-600">{(inv.order as any)?.order_number ?? "—"}</td>
                  <td className="px-5 py-3 text-gray-500">{new Date(inv.issued_at).toLocaleDateString("fr-FR")}</td>
                  <td className="px-5 py-3 font-semibold text-orange-600">{fmt(inv.amount)}</td>
                  <td className="px-5 py-3"><InvoiceButton invoiceId={inv.id} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
