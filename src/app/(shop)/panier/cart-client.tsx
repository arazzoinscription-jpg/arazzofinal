"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { updateQuantity, removeFromCart } from "@/app/actions/cart";
import { toast } from "@/components/ui/toast";
import type { CartLineDetailed } from "@/app/actions/cart";

export function CartClient({ items, subtotal }: { items: CartLineDetailed[]; subtotal: number }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

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
        <div className="flex justify-between font-bold text-lg font-playfair text-orange-600 border-t border-cream-100 pt-3 mt-2">
          <span>Total</span>
          <span>{Number(subtotal).toLocaleString("fr-DZ")} DA</span>
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
