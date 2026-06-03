import Link from "next/link";
import { redirect } from "next/navigation";
import { getOrder } from "@/app/actions/orders";

export const metadata = { title: "Commande confirmée — Arazzo" };
export const dynamic = "force-dynamic";

const STATUS: Record<string, { label: string; cls: string }> = {
  pending: { label: "En attente", cls: "bg-gray-100 text-gray-600" },
  payment_pending: { label: "Paiement en attente", cls: "bg-yellow-100 text-yellow-700" },
  payment_review: { label: "Preuve en cours de vérification", cls: "bg-blue-100 text-blue-700" },
  confirmed: { label: "Confirmée ✓", cls: "bg-green-100 text-green-700" },
  shipped: { label: "Expédiée", cls: "bg-violet-100 text-violet-700" },
  delivered: { label: "Livrée", cls: "bg-green-100 text-green-700" },
  cancelled: { label: "Annulée", cls: "bg-red-100 text-red-700" },
  refunded: { label: "Remboursée", cls: "bg-gray-100 text-gray-600" },
};
const fmt = (n: number) => `${Number(n).toLocaleString("fr-DZ")} DA`;

export default async function ConfirmationPage({ params }: { params: { orderId: string } }) {
  const res = await getOrder(params.orderId);
  if (!res.ok || !res.order) redirect("/boutique");
  const order = res.order as any;
  const st = STATUS[order.status] ?? STATUS.pending;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-2xl border border-cream-200 p-8 text-center">
        <div className="text-6xl mb-3">✅</div>
        <h1 className="font-playfair text-3xl font-bold text-gray-900">Commande reçue</h1>
        <p className="text-gray-500 mt-2 font-dm">
          Merci ! Votre commande <strong className="text-violet-DEFAULT">{order.order_number}</strong> a bien été enregistrée.
        </p>
        <span className={`inline-block mt-4 px-3 py-1 rounded-full text-sm font-semibold ${st.cls}`}>{st.label}</span>
      </div>

      <div className="bg-white rounded-2xl border border-cream-200 p-6 mt-6">
        <h2 className="font-semibold text-gray-900 mb-3">Récapitulatif</h2>
        <div className="space-y-2">
          {(order.order_items ?? []).map((it: any) => (
            <div key={it.id} className="flex justify-between text-sm font-dm">
              <span className="text-gray-600">{it.title} × {it.quantity}</span>
              <span className="font-semibold">{fmt(it.price * it.quantity)}</span>
            </div>
          ))}
        </div>
        <div className="flex justify-between font-bold text-lg font-playfair text-violet-DEFAULT border-t border-cream-100 pt-3 mt-3">
          <span>Total</span><span>{fmt(order.total)}</span>
        </div>
        {order.status === "payment_review" && (
          <p className="text-sm text-blue-600 font-dm mt-4 bg-blue-50 rounded-xl p-3">
            Votre preuve de paiement est en cours de vérification. Vous recevrez un email dès validation.
          </p>
        )}
      </div>

      <div className="flex gap-3 mt-6">
        <Link href="/dashboard/commandes" className="flex-1 text-center bg-violet-DEFAULT text-white py-3 rounded-xl font-semibold hover:bg-violet-700">Mes commandes</Link>
        <Link href="/boutique" className="flex-1 text-center border-2 border-gray-200 text-gray-600 py-3 rounded-xl font-semibold hover:bg-cream-50">Retour à la boutique</Link>
      </div>
    </div>
  );
}
