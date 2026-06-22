import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Package } from "lucide-react";
import { InvoiceButton } from "./invoice-button";
import { ProofCTA } from "./proof-cta";
import { CancelOrderButton } from "./cancel-order";
import { DashHeader, ATELIER_CARD } from "../dash-header";

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
// Commandes pour lesquelles le client peut (encore) envoyer une preuve CCP / virement
const AWAITING_PROOF = ["pending", "payment_pending", "payment_review"];
// Commandes que le client peut annuler/supprimer lui-même (changement d'avis)
const CANCELLABLE = ["pending", "payment_pending", "payment_review", "cancelled"];

export default async function MesCommandesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: orders } = await supabase
    .from("orders")
    .select("id, order_number, status, total, payment_method, created_at, order_items(id, title, quantity), invoices(id), payment_proofs(id, status)")
    .eq("customer_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div>
      <DashHeader index="06" eyebrow="Boutique" title="Mes commandes" subtitle="Suivez vos achats, factures et preuves de paiement." />

      {!orders?.length ? (
        <div className={`flex flex-col items-center text-center py-20 rounded-2xl ${ATELIER_CARD}`}>
          <Package size={48} strokeWidth={1.5} className="mb-4 text-cream-300 dark:text-white/20" />
          <p className="text-xl text-violet-950/55 dark:text-white/45 mb-4 font-dm">Aucune commande pour le moment</p>
          <Link href="/boutique" className="shiny-cta inline-block bg-orange-DEFAULT text-white px-6 py-3 rounded-xl font-semibold hover:bg-orange-600">Découvrir la boutique</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((o) => {
            const st = STATUS[o.status] ?? STATUS.pending;
            const items = (o.order_items as any[]) ?? [];
            const invoice = ((o.invoices as any[]) ?? [])[0];
            const proofs = (o.payment_proofs as any[]) ?? [];
            // Une preuve « active » bloque le renvoi (en attente ou approuvée)
            const hasActiveProof = proofs.some((p) => ["pending", "approved"].includes(p.status));
            const canSendProof =
              ["ccp", "transfer"].includes(o.payment_method) && AWAITING_PROOF.includes(o.status);
            return (
              <div key={o.id} className={`rounded-2xl p-5 ${ATELIER_CARD}`}>
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
                    {CANCELLABLE.includes(o.status) && <CancelOrderButton orderId={o.id} />}
                    {CONFIRMED.includes(o.status) && (
                      invoice ? <InvoiceButton invoiceId={invoice.id} /> : <InvoiceButton orderId={o.id} />
                    )}
                    <Link href={`/confirmation/${o.id}`} className="text-sm font-semibold text-gray-600 hover:text-orange-600 hover:underline">Détail →</Link>
                  </div>
                </div>

                {canSendProof && (
                  <div className="border-t border-cream-100 pt-3 mt-3">
                    <ProofCTA orderId={o.id} alreadySent={hasActiveProof} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
