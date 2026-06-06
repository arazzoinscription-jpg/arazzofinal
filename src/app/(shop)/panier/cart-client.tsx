"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Tag, X, Loader2, Check } from "lucide-react";
import { updateQuantity, removeFromCart } from "@/app/actions/cart";
import { applyPromo, removePromo } from "@/app/actions/promo";
import { toast } from "@/components/ui/toast";
import type { CartLineDetailed } from "@/app/actions/cart";

function PromoCode({ appliedCode, discount }: { appliedCode: string | null; discount: number }) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function apply() {
    setError(null);
    start(async () => {
      const res = await applyPromo(code);
      if (res.ok) { toast(`Code « ${res.code} » appliqué 🎉`, "success"); setCode(""); router.refresh(); }
      else setError(res.error);
    });
  }
  function remove() {
    start(async () => { await removePromo(); router.refresh(); });
  }

  if (appliedCode) {
    return (
      <div className="mt-4 flex items-center justify-between rounded-xl bg-green-50 border border-green-200 px-3 py-2.5">
        <span className="inline-flex items-center gap-2 text-sm font-semibold text-green-700">
          <Check size={15} /> {appliedCode} · −{Number(discount).toLocaleString("fr-DZ")} DA
        </span>
        <button onClick={remove} disabled={pending} aria-label="Retirer le code"
          className="text-green-700/70 hover:text-green-900 disabled:opacity-50">
          {pending ? <Loader2 size={15} className="animate-spin" /> : <X size={15} />}
        </button>
      </div>
    );
  }

  return (
    <div className="mt-4">
      <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 mb-1.5">
        <Tag size={13} /> Code promo
      </label>
      <div className="flex gap-2">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && apply()}
          placeholder="Ex. ARAZZO10"
          className="flex-1 min-w-0 rounded-xl border border-cream-200 bg-white px-3 py-2 text-sm uppercase placeholder:normal-case focus:outline-none focus:ring-2 focus:ring-violet-500"
        />
        <button onClick={apply} disabled={pending || !code.trim()}
          className="rounded-xl bg-violet-700 hover:bg-violet-800 text-white text-sm font-semibold px-4 transition-colors disabled:opacity-50">
          {pending ? <Loader2 size={15} className="animate-spin" /> : "Appliquer"}
        </button>
      </div>
      {error && <p className="text-xs text-red-500 mt-1.5">{error}</p>}
    </div>
  );
}

export function CartClient({
  items, subtotal, discount = 0, total, appliedCode = null,
}: {
  items: CartLineDetailed[];
  subtotal: number;
  discount?: number;
  total?: number;
  appliedCode?: string | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const grandTotal = total ?? subtotal - discount;

  function setQty(productId: string, qty: number) {
    startTransition(async () => {
      const res = await updateQuantity(productId, qty);
      if (res.ok) router.refresh();
      else toast(res.error ?? "Erreur", "error");
    });
  }
  function remove(productId: string) {
    startTransition(async () => {
      const res = await removeFromCart(productId);
      if (res.ok) { toast("Article retiré", "info"); router.refresh(); }
      else toast(res.error ?? "Erreur", "error");
    });
  }

  return (
    <div className="grid lg:grid-cols-3 gap-6 items-start">
      {/* Articles */}
      <div className="lg:col-span-2 space-y-3">
        {items.map((it) => (
          <div key={it.productId} className="bg-white rounded-2xl border border-cream-200 p-4 flex items-center gap-4">
            <div className="w-20 h-20 rounded-xl bg-cream-100 overflow-hidden flex items-center justify-center text-2xl flex-shrink-0">
              {it.image ? <img src={it.image} alt="" className="w-full h-full object-cover" /> : "🧵"}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 font-dm line-clamp-1">{it.title}</h3>
              <p className="text-sm text-orange-600 font-semibold">{Number(it.price).toLocaleString("fr-DZ")} DA</p>
              <div className="flex items-center gap-3 mt-2">
                <div className="flex items-center border border-cream-200 rounded-lg overflow-hidden">
                  <button onClick={() => setQty(it.productId, it.quantity - 1)} disabled={isPending}
                    className="px-3 py-1 text-gray-600 hover:bg-cream-50 disabled:opacity-50">−</button>
                  <span className="px-3 text-sm font-semibold">{it.quantity}</span>
                  <button onClick={() => setQty(it.productId, it.quantity + 1)} disabled={isPending}
                    className="px-3 py-1 text-gray-600 hover:bg-cream-50 disabled:opacity-50">+</button>
                </div>
                <button onClick={() => remove(it.productId)} disabled={isPending}
                  className="text-sm text-red-400 hover:text-red-600 font-semibold disabled:opacity-50">Supprimer</button>
              </div>
            </div>
            <div className="text-right font-bold text-gray-900 font-dm flex-shrink-0">
              {Number(it.lineTotal).toLocaleString("fr-DZ")} DA
            </div>
          </div>
        ))}
      </div>

      {/* Récapitulatif */}
      <div className="bg-white rounded-2xl border border-cream-200 p-5 lg:sticky lg:top-24">
        <h2 className="font-semibold text-gray-900 mb-4">Récapitulatif</h2>
        <div className="flex justify-between text-sm font-dm mb-2">
          <span className="text-gray-500">Sous-total</span>
          <span className="font-semibold">{Number(subtotal).toLocaleString("fr-DZ")} DA</span>
        </div>
        {discount > 0 && (
          <div className="flex justify-between text-sm font-dm mb-2 text-green-700">
            <span>Remise{appliedCode ? ` (${appliedCode})` : ""}</span>
            <span className="font-semibold">−{Number(discount).toLocaleString("fr-DZ")} DA</span>
          </div>
        )}

        {/* Code promo */}
        <PromoCode appliedCode={appliedCode} discount={discount} />

        <div className="flex justify-between font-bold text-lg font-playfair text-orange-600 border-t border-cream-100 pt-3 mt-4">
          <span>Total</span>
          <span>{Number(grandTotal).toLocaleString("fr-DZ")} DA</span>
        </div>
        <Link href="/checkout"
          className="mt-5 block text-center bg-orange-DEFAULT text-white py-3 rounded-xl font-semibold hover:bg-orange-600 transition-colors">
          Passer la commande →
        </Link>
        <Link href="/boutique" className="mt-2 block text-center text-sm text-gray-500 hover:text-orange-600">
          Continuer mes achats
        </Link>
      </div>
    </div>
  );
}
