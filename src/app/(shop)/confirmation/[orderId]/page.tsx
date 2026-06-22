import Link from "next/link";
import { redirect } from "next/navigation";
import { getOrder } from "@/app/actions/orders";
import { createAdminClient } from "@/lib/supabase/admin";
import { InvoiceButton } from "./invoice-button";
import { InvoiceEmailButton } from "./invoice-email-button";
import { ProofUpload } from "./proof-upload";

export const metadata = { title: "Merci pour votre commande — Arazzo" };
export const dynamic = "force-dynamic";

const STATUS: Record<string, { label: string; cls: string }> = {
  pending: { label: "En attente", cls: "bg-gray-100 text-gray-600" },
  payment_pending: { label: "Paiement en attente", cls: "bg-yellow-100 text-yellow-700" },
  payment_review: { label: "Preuve en cours de vérification", cls: "bg-blue-100 text-blue-700" },
  confirmed: { label: "Confirmée ✓", cls: "bg-green-100 text-green-700" },
  shipped: { label: "Expédiée", cls: "bg-orange-100 text-orange-600" },
  delivered: { label: "Terminée / Livrée", cls: "bg-green-100 text-green-700" },
  cancelled: { label: "Annulée", cls: "bg-red-100 text-red-700" },
  refunded: { label: "Remboursée", cls: "bg-gray-100 text-gray-600" },
};
const PAY_HINT: Record<string, string> = {
  ccp: "Effectuez le versement CCP / BaridiMob, puis envoyez votre reçu pour validation.",
  paypal: "Votre paiement PayPal est en cours de traitement.",
  cod: "Vous réglerez à la livraison. Nous vous contacterons pour l'expédition.",
  transfer: "Effectuez le virement du montant total ; votre commande sera validée à réception.",
  chargily: "Votre paiement en ligne est en cours de traitement ; votre commande sera validée dès confirmation.",
};
const fmt = (n: number) => `${Number(n).toLocaleString("fr-DZ")} DA`;
const PROCESSING = ["pending", "payment_pending", "payment_review"];

export default async function ConfirmationPage({ params }: { params: { orderId: string } }) {
  const res = await getOrder(params.orderId);
  // Commande introuvable : renvoyer l'utilisateur vers SES commandes (pas la boutique publique)
  if (!res.ok || !res.order) redirect("/dashboard/commandes");
  const order = res.order as any;
  const st = STATUS[order.status] ?? STATUS.pending;
  const invoice = (order.invoices ?? [])[0] ?? null;
  const isProcessing = PROCESSING.includes(order.status);
  const canSendProof = ["ccp", "transfer"].includes(order.payment_method) && PROCESSING.includes(order.status);

  // Coordonnées de paiement (CCP / virement) à afficher pour guider le client.
  let payInfo: { account_number?: string; account_key?: string; beneficiary_name?: string; rip?: string } | null = null;
  if (canSendProof) {
    try {
      const admin = createAdminClient();
      const { data } = await admin
        .from("ccp_config").select("account_number, account_key, beneficiary_name, rip").eq("is_active", true).limit(1).maybeSingle();
      payInfo = data ?? null;
    } catch { /* pas de config : on affiche quand même les étapes génériques */ }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-2xl border border-cream-200 p-8 text-center">
        <div className="text-6xl mb-3">🎉</div>
        <h1 className="font-playfair text-3xl font-bold text-gray-900">Merci pour votre commande !</h1>
        <p className="text-gray-500 mt-2 font-dm">
          Votre commande <strong className="text-orange-600">{order.order_number}</strong> a bien été enregistrée.
        </p>
        <span className={`inline-block mt-4 px-3 py-1 rounded-full text-sm font-semibold ${st.cls}`}>{st.label}</span>
      </div>

      {/* En cours de traitement */}
      {isProcessing && (
        <div className="mt-6 rounded-2xl border border-orange-100 bg-orange-50/70 p-5 flex items-start gap-3">
          <span className="text-2xl">⏳</span>
          <div>
            <p className="font-semibold text-gray-900 font-dm">Votre demande est en cours de traitement</p>
            <p className="text-sm text-gray-600 font-dm mt-1">{PAY_HINT[order.payment_method] ?? "Nous traitons votre commande."}</p>
            {order.status === "payment_review" && (
              <p className="text-sm text-blue-700 font-dm mt-2">Votre preuve de paiement est en cours de vérification — vous recevrez un email dès validation.</p>
            )}
          </div>
        </div>
      )}

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
        {order.discount > 0 && (
          <div className="flex justify-between text-sm font-dm text-green-700 mt-2">
            <span>Remise</span><span>−{fmt(order.discount)}</span>
          </div>
        )}
        <div className="flex justify-between font-bold text-lg font-playfair text-orange-600 border-t border-cream-100 pt-3 mt-3">
          <span>Total</span><span>{fmt(order.total)}</span>
        </div>

        <div className="mt-4 pt-4 border-t border-cream-100">
          {invoice && <InvoiceButton invoiceId={invoice.id} invoiceNumber={invoice.invoice_number ?? null} />}
          <InvoiceEmailButton orderId={order.id} />
        </div>
      </div>

      {/* Étapes de paiement (virement / CCP) */}
      {canSendProof && (
        <div className="mt-6 bg-white rounded-2xl border border-cream-200 p-6">
          <h2 className="font-semibold text-gray-900 mb-3">Comment valider votre paiement</h2>
          <ol className="space-y-2.5 text-sm text-gray-700 font-dm list-decimal ps-5">
            <li>Effectuez le versement de <strong className="text-orange-600">{fmt(order.total)}</strong> {payInfo ? "sur le compte ci-dessous" : "sur le compte qui vous a été communiqué"}.</li>
            <li>Prenez une <strong>photo / capture du reçu</strong>.</li>
            <li>Envoyez-la via le bouton ci-dessous.</li>
            <li>L'équipe vérifie (sous 24–48 h) → vos formations/produits deviennent accessibles ✅</li>
          </ol>

          {payInfo && (
            <div className="mt-4 rounded-xl bg-cream-50 border border-cream-200 p-4 text-sm font-dm">
              <p className="font-semibold text-gray-900 mb-1">Coordonnées de paiement</p>
              {payInfo.beneficiary_name && <p className="text-gray-600">Bénéficiaire : <strong>{payInfo.beneficiary_name}</strong></p>}
              {payInfo.account_number && <p className="text-gray-600">N° de compte / CCP : <strong>{payInfo.account_number}</strong></p>}
              {payInfo.account_key && <p className="text-gray-600">Clé : <strong>{payInfo.account_key}</strong></p>}
              {payInfo.rip && <p className="text-gray-600">BaridiMob (RIP) : <strong>{payInfo.rip}</strong></p>}
            </div>
          )}

          <div className="mt-5">
            <ProofUpload orderId={order.id} />
          </div>
        </div>
      )}

      <div className="flex gap-3 mt-6">
        <Link href="/dashboard/commandes" className="flex-1 text-center bg-orange-DEFAULT text-white py-3 rounded-xl font-semibold hover:bg-orange-600">Mes commandes</Link>
        <Link href="/boutique" className="flex-1 text-center border-2 border-gray-200 text-gray-600 py-3 rounded-xl font-semibold hover:bg-cream-50">Retour à la boutique</Link>
      </div>
    </div>
  );
}
