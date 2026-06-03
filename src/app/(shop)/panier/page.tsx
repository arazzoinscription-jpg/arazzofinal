import Link from "next/link";
import { getCart } from "@/app/actions/cart";
import { CartClient } from "./cart-client";

export const metadata = { title: "Mon panier — Arazzo" };
export const dynamic = "force-dynamic";

export default async function PanierPage() {
  const { items, subtotal } = await getCart();

  return (
    <div>
      <h1 className="font-playfair text-3xl font-bold text-gray-900 mb-6">Mon panier</h1>

      {items.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-cream-200">
          <div className="text-6xl mb-4">🛒</div>
          <p className="text-xl text-gray-400 mb-4">Votre panier est vide</p>
          <Link href="/boutique"
            className="inline-block bg-orange-DEFAULT text-white px-6 py-3 rounded-xl font-semibold hover:bg-orange-600 transition-colors">
            Découvrir la boutique
          </Link>
        </div>
      ) : (
        <CartClient items={items} subtotal={subtotal} />
      )}
    </div>
  );
}
