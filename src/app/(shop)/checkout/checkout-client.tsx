"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createOrder } from "@/app/actions/orders";
import { toast } from "@/components/ui/toast";
import type { CartLineDetailed } from "@/app/actions/cart";

interface DefaultCustomer {
  full_name: string; phone: string; email: string;
  address: string; city: string; wilaya: string; country: string;
}

const fmt = (n: number) => `${Number(n).toLocaleString("fr-DZ")} DA`;

export function CheckoutClient({
  items, subtotal, discount = 0, total, appliedCode = null, defaultCustomer,
}: {
  items: CartLineDetailed[]; subtotal: number; discount?: number; total?: number; appliedCode?: string | null;
  defaultCustomer: DefaultCustomer;
}) {
  const router = useRouter();
  const grandTotal = total ?? subtotal - discount;
  const [step, setStep] = useState<1 | 2>(1);
  const [customer, setCustomer] = useState<DefaultCustomer>(defaultCustomer);
  const [isPending, startTransition] = useTransition();

  const cartPayload = items.map((i) => ({ productId: i.productId, quantity: i.quantity }));

  function set<K extends keyof DefaultCustomer>(k: K, v: string) {
    setCustomer((c) => ({ ...c, [k]: v }));
  }

  function step1Valid() {
    return customer.full_name.trim().length >= 2 && customer.phone.trim().length >= 6 && /\S+@\S+\.\S+/.test(customer.email);
  }

  /**
   * Crée la commande en VIREMENT (statut « en attente », AUCUN accès accordé).
   * Le client paie ensuite par virement/CCP et envoie sa preuve ; l'admin valide
   * → c'est seulement à ce moment que la commande est confirmée et l'accès donné.
   */
  function pay() {
    startTransition(async () => {
      const res = await createOrder(cartPayload, customer, "transfer");
      if (!res.ok || !res.orderId) { toast(res.error ?? "Erreur de commande", "error"); return; }
      toast("Commande enregistrée — suivez les étapes de paiement", "success");
      router.push(`/confirmation/${res.orderId}`);
    });
  }

  return (
    <div className="grid lg:grid-cols-3 gap-6 items-start">
      <div className="lg:col-span-2 space-y-6">
        {/* Fil d'étapes */}
        <div className="flex items-center gap-2 text-sm font-dm">
          {[1, 2].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <span className={`w-7 h-7 rounded-full flex items-center justify-center font-bold ${
                step >= s ? "bg-orange-DEFAULT text-white" : "bg-cream-200 text-gray-400"}`}>{s}</span>
              {s < 2 && <span className={`w-8 h-0.5 ${step > s ? "bg-orange-DEFAULT" : "bg-cream-200"}`} />}
            </div>
          ))}
          <span className="ml-2 text-gray-500">{step === 1 ? "Vos informations" : "Paiement"}</span>
        </div>

        {/* ÉTAPE 1 — formulaire client (nom, téléphone, email) */}
        {step === 1 && (
          <div className="bg-white rounded-2xl border border-cream-200 p-5 space-y-4">
            <Field label="Nom complet *" value={customer.full_name} onChange={(v) => set("full_name", v)} />
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Téléphone *" value={customer.phone} onChange={(v) => set("phone", v)} />
              <Field label="Email *" type="email" value={customer.email} onChange={(v) => set("email", v)} />
            </div>
            <button onClick={() => step1Valid() ? setStep(2) : toast("Remplissez nom, téléphone et email", "error")}
              className="w-full bg-orange-DEFAULT text-white py-3 rounded-xl font-semibold hover:bg-orange-600 transition-colors">
              Continuer vers le paiement →
            </button>
          </div>
        )}

        {/* ÉTAPE 2 — paiement par virement / CCP (validé par l'équipe après preuve) */}
        {step === 2 && (
          <div className="bg-white rounded-2xl border border-cream-200 p-5">
            <div className="rounded-xl border border-orange-DEFAULT bg-orange-50 p-4 mb-4">
              <p className="font-semibold text-orange-700 font-dm flex items-center gap-2">🏦 Paiement par virement / CCP</p>
              <p className="text-sm text-gray-600 font-dm mt-1">
                Après avoir passé la commande, vous recevrez les <strong>étapes de paiement</strong> et pourrez <strong>envoyer votre preuve</strong>. Votre accès est débloqué dès que l'équipe valide le paiement.
              </p>
            </div>

            <ol className="text-sm text-gray-600 font-dm space-y-1.5 mb-4 list-decimal ps-5">
              <li>Validez votre commande ci-dessous</li>
              <li>Effectuez le virement / versement CCP du montant total</li>
              <li>Envoyez la photo de votre reçu (preuve de paiement)</li>
              <li>L'équipe valide → vos formations deviennent accessibles ✅</li>
            </ol>

            {/* Rappel client */}
            <div className="text-sm text-gray-500 font-dm border-t border-cream-100 mt-2 pt-3">
              <p>{customer.full_name} · {customer.phone}</p>
              <p>{customer.email}</p>
            </div>

            <div className="flex gap-3 mt-5">
              <button onClick={() => setStep(1)} className="flex-1 border-2 border-gray-200 text-gray-600 py-3 rounded-xl font-semibold hover:bg-cream-50">← Modifier</button>
              <button onClick={pay} disabled={isPending}
                className="flex-[2] bg-orange-DEFAULT text-white py-3 rounded-xl font-semibold hover:bg-orange-600 transition-colors disabled:opacity-50">
                {isPending ? "Traitement…" : `Passer la commande · ${fmt(grandTotal)}`}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Total (colonne) */}
      <div className="bg-white rounded-2xl border border-cream-200 p-5 lg:sticky lg:top-24">
        <h2 className="font-semibold text-gray-900 mb-4">Total</h2>
        <div className="flex justify-between text-sm font-dm mb-2">
          <span className="text-gray-500">{items.reduce((s, i) => s + i.quantity, 0)} article(s)</span>
          <span className="font-semibold">{fmt(subtotal)}</span>
        </div>
        {discount > 0 && (
          <div className="flex justify-between text-sm font-dm mb-2 text-green-700">
            <span>Remise{appliedCode ? ` (${appliedCode})` : ""}</span>
            <span className="font-semibold">−{fmt(discount)}</span>
          </div>
        )}
        <div className="flex justify-between font-bold text-lg font-playfair text-orange-600 border-t border-cream-100 pt-3 mt-2">
          <span>À payer</span><span>{fmt(grandTotal)}</span>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-500" />
    </div>
  );
}
