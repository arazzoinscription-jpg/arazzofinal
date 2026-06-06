"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createOrder } from "@/app/actions/orders";
import { submitCCPProof, createPayPalOrder, confirmCODOrder } from "@/app/actions/payments";
import { toast } from "@/components/ui/toast";
import type { CartLineDetailed } from "@/app/actions/cart";

interface CCPConfig {
  account_number: string | null;
  account_key: string | null;
  beneficiary_name: string | null;
  qr_code_url: string | null;
}
interface DefaultCustomer {
  full_name: string; phone: string; email: string;
  address: string; city: string; wilaya: string; country: string;
}
type Method = "ccp" | "paypal" | "cod" | "transfer";

const fmt = (n: number) => `${Number(n).toLocaleString("fr-DZ")} DA`;

export function CheckoutClient({
  items, subtotal, discount = 0, total, appliedCode = null, defaultCustomer, ccpConfig,
}: {
  items: CartLineDetailed[]; subtotal: number; discount?: number; total?: number; appliedCode?: string | null;
  defaultCustomer: DefaultCustomer; ccpConfig: CCPConfig | null;
}) {
  const router = useRouter();
  const grandTotal = total ?? subtotal - discount;
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [customer, setCustomer] = useState<DefaultCustomer>(defaultCustomer);
  const [method, setMethod] = useState<Method>("ccp");
  const [isPending, startTransition] = useTransition();

  // CCP / virement
  const fileRef = useRef<HTMLInputElement>(null);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [txId, setTxId] = useState("");
  const [dragOver, setDragOver] = useState(false);

  const cartPayload = items.map((i) => ({ productId: i.productId, quantity: i.quantity }));

  function set<K extends keyof DefaultCustomer>(k: K, v: string) {
    setCustomer((c) => ({ ...c, [k]: v }));
  }

  function step1Valid() {
    return customer.full_name.trim().length >= 2 && customer.phone.trim().length >= 6 && /\S+@\S+\.\S+/.test(customer.email);
  }

  function pickFile(f: File | null) {
    if (!f) return;
    const okType = ["image/jpeg", "image/png", "application/pdf"].includes(f.type) || /\.(jpg|jpeg|png|pdf)$/i.test(f.name);
    if (!okType) { toast("Format non supporté (JPG, PNG, PDF)", "error"); return; }
    if (f.size > 10 * 1024 * 1024) { toast("Fichier trop lourd (max 10 Mo)", "error"); return; }
    setProofFile(f);
    setPreview(f.type.startsWith("image/") ? URL.createObjectURL(f) : null);
  }

  /** Crée la commande puis exécute le flux propre au mode de paiement. */
  function pay() {
    if (method === "ccp" && !proofFile) { toast("Ajoutez la preuve de paiement", "error"); return; }

    startTransition(async () => {
      const res = await createOrder(cartPayload, customer, method);
      if (!res.ok || !res.orderId) { toast(res.error ?? "Erreur de commande", "error"); return; }
      const orderId = res.orderId;

      if (method === "ccp") {
        const up = await submitCCPProof(orderId, proofFile!, txId || undefined);
        if (!up.ok) { toast(up.error ?? "Envoi de la preuve échoué", "error"); return; }
        toast("Preuve envoyée, en attente de validation", "success");
        router.push(`/confirmation/${orderId}`);
      } else if (method === "paypal") {
        const pp = await createPayPalOrder(orderId);
        if (pp.ok && pp.approveUrl) { window.location.href = pp.approveUrl; }
        else { toast(pp.error ?? "PayPal indisponible", "error"); }
      } else if (method === "cod") {
        const cod = await confirmCODOrder(orderId);
        if (!cod.ok) { toast(cod.error ?? "Erreur", "error"); return; }
        toast("Commande confirmée", "success");
        router.push(`/confirmation/${orderId}`);
      } else {
        // Virement : commande créée, instructions affichées sur la confirmation
        toast("Commande enregistrée", "success");
        router.push(`/confirmation/${orderId}`);
      }
    });
  }

  const TABS: { id: Method; label: string; icon: string }[] = [
    { id: "ccp", label: "CCP / BaridiMob", icon: "🏦" },
    { id: "paypal", label: "PayPal", icon: "🅿️" },
    { id: "cod", label: "Livraison", icon: "🚚" },
    { id: "transfer", label: "Virement", icon: "💳" },
  ];

  return (
    <div className="grid lg:grid-cols-3 gap-6 items-start">
      <div className="lg:col-span-2 space-y-6">
        {/* Fil d'étapes */}
        <div className="flex items-center gap-2 text-sm font-dm">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <span className={`w-7 h-7 rounded-full flex items-center justify-center font-bold ${
                step >= s ? "bg-orange-DEFAULT text-white" : "bg-cream-200 text-gray-400"}`}>{s}</span>
              {s < 3 && <span className={`w-8 h-0.5 ${step > s ? "bg-orange-DEFAULT" : "bg-cream-200"}`} />}
            </div>
          ))}
          <span className="ml-2 text-gray-500">
            {step === 1 ? "Vos informations" : step === 2 ? "Résumé" : "Paiement"}
          </span>
        </div>

        {/* ÉTAPE 1 — formulaire client */}
        {step === 1 && (
          <div className="bg-white rounded-2xl border border-cream-200 p-5 space-y-4">
            <Field label="Nom complet *" value={customer.full_name} onChange={(v) => set("full_name", v)} />
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Téléphone *" value={customer.phone} onChange={(v) => set("phone", v)} />
              <Field label="Email *" type="email" value={customer.email} onChange={(v) => set("email", v)} />
            </div>
            <Field label="Adresse" value={customer.address} onChange={(v) => set("address", v)} />
            <div className="grid sm:grid-cols-3 gap-4">
              <Field label="Ville" value={customer.city} onChange={(v) => set("city", v)} />
              <Field label="Wilaya" value={customer.wilaya} onChange={(v) => set("wilaya", v)} />
              <Field label="Pays" value={customer.country} onChange={(v) => set("country", v)} />
            </div>
            <button onClick={() => step1Valid() ? setStep(2) : toast("Remplissez nom, téléphone et email", "error")}
              className="w-full bg-orange-DEFAULT text-white py-3 rounded-xl font-semibold hover:bg-orange-600 transition-colors">
              Continuer →
            </button>
          </div>
        )}

        {/* ÉTAPE 2 — résumé */}
        {step === 2 && (
          <div className="bg-white rounded-2xl border border-cream-200 p-5">
            <h2 className="font-semibold text-gray-900 mb-3">Vérifiez votre commande</h2>
            <div className="space-y-2 mb-4">
              {items.map((it) => (
                <div key={it.productId} className="flex justify-between text-sm font-dm">
                  <span className="text-gray-600">{it.title} × {it.quantity}</span>
                  <span className="font-semibold">{fmt(it.lineTotal)}</span>
                </div>
              ))}
            </div>
            <div className="text-sm text-gray-500 font-dm border-t border-cream-100 pt-3">
              <p>{customer.full_name} · {customer.phone}</p>
              <p>{customer.email}</p>
              {(customer.address || customer.city) && <p>{[customer.address, customer.city, customer.wilaya, customer.country].filter(Boolean).join(", ")}</p>}
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setStep(1)} className="flex-1 border-2 border-gray-200 text-gray-600 py-3 rounded-xl font-semibold hover:bg-cream-50">← Modifier</button>
              <button onClick={() => setStep(3)} className="flex-1 bg-orange-DEFAULT text-white py-3 rounded-xl font-semibold hover:bg-orange-600">Choisir le paiement →</button>
            </div>
          </div>
        )}

        {/* ÉTAPE 3 — paiement */}
        {step === 3 && (
          <div className="bg-white rounded-2xl border border-cream-200 p-5">
            {/* Onglets */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-5">
              {TABS.map((t) => (
                <button key={t.id} onClick={() => setMethod(t.id)}
                  className={`py-2 rounded-xl text-sm font-semibold font-dm border transition-colors ${
                    method === t.id ? "bg-orange-50 border-orange-DEFAULT text-orange-600" : "border-cream-200 text-gray-500 hover:bg-cream-50"}`}>
                  <span className="block text-lg">{t.icon}</span>{t.label}
                </button>
              ))}
            </div>

            {/* CCP */}
            {method === "ccp" && (
              <div className="space-y-4">
                {ccpConfig ? (
                  <div className="bg-cream-50 rounded-xl p-4 text-sm font-dm space-y-1">
                    <Row k="N° de compte CCP" v={ccpConfig.account_number} />
                    <Row k="Clé" v={ccpConfig.account_key} />
                    <Row k="Bénéficiaire" v={ccpConfig.beneficiary_name} />
                    {ccpConfig.qr_code_url && <img src={ccpConfig.qr_code_url} alt="QR" className="w-32 h-32 mt-2 rounded-lg border border-cream-200" />}
                  </div>
                ) : <p className="text-sm text-gray-400">Coordonnées CCP non configurées.</p>}

                <Field label="Numéro de transaction" value={txId} onChange={setTxId} />

                {/* Drag & drop */}
                <div
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => { e.preventDefault(); setDragOver(false); pickFile(e.dataTransfer.files?.[0] ?? null); }}
                  onClick={() => fileRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
                    dragOver ? "border-orange-DEFAULT bg-orange-50" : "border-cream-300 hover:bg-cream-50"}`}>
                  <input ref={fileRef} type="file" accept="image/jpeg,image/png,application/pdf" className="hidden"
                    onChange={(e) => pickFile(e.target.files?.[0] ?? null)} />
                  {proofFile ? (
                    <div>
                      {preview ? <img src={preview} alt="" className="max-h-40 mx-auto rounded-lg mb-2" /> : <div className="text-4xl mb-2">📄</div>}
                      <p className="text-sm text-gray-600 font-dm">{proofFile.name}</p>
                    </div>
                  ) : (
                    <div className="text-gray-400">
                      <div className="text-3xl mb-1">📤</div>
                      <p className="text-sm font-dm">Glissez votre reçu ici, ou cliquez (JPG, PNG, PDF · max 10 Mo)</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* PayPal */}
            {method === "paypal" && (
              <p className="text-sm text-gray-600 font-dm">Vous serez redirigé vers PayPal pour finaliser le paiement en toute sécurité, puis ramené sur la page de confirmation.</p>
            )}

            {/* Livraison (COD) */}
            {method === "cod" && (
              <p className="text-sm text-gray-600 font-dm">Paiement à la réception. Confirmez votre commande, vous réglerez à la livraison.</p>
            )}

            {/* Virement */}
            {method === "transfer" && (
              <div className="bg-cream-50 rounded-xl p-4 text-sm font-dm space-y-1">
                <p className="font-semibold text-gray-800 mb-1">Coordonnées bancaires</p>
                <Row k="Bénéficiaire" v={ccpConfig?.beneficiary_name ?? "Arazzo Formation"} />
                <Row k="RIB / Compte" v={ccpConfig?.account_number ?? "—"} />
                <p className="text-gray-500 mt-2">Effectuez le virement du montant total, puis confirmez. Votre commande sera validée après réception.</p>
              </div>
            )}

            <div className="flex gap-3 mt-5">
              <button onClick={() => setStep(2)} className="flex-1 border-2 border-gray-200 text-gray-600 py-3 rounded-xl font-semibold hover:bg-cream-50">← Retour</button>
              <button onClick={pay} disabled={isPending}
                className="flex-[2] bg-orange-DEFAULT text-white py-3 rounded-xl font-semibold hover:bg-orange-600 transition-colors disabled:opacity-50">
                {isPending ? "Traitement…"
                  : method === "ccp" ? "Valider le paiement"
                  : method === "paypal" ? "Payer avec PayPal"
                  : method === "cod" ? "Confirmer la commande"
                  : "J'ai effectué le virement"}
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
function Row({ k, v }: { k: string; v: string | null }) {
  return <div className="flex justify-between gap-3"><span className="text-gray-500">{k}</span><span className="font-semibold text-gray-800">{v ?? "—"}</span></div>;
}
