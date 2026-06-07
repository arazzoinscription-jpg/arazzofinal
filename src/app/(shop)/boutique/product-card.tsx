"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { addToCart } from "@/app/actions/cart";
import { toast } from "@/components/ui/toast";

export interface ShopProduct {
  id: string;
  title: string;
  description: string | null;
  type: string;
  price: number;
  compare_price: number | null;
  images: string[];
  stock: number | null;
  slug: string;
}

const TYPE_LABEL: Record<string, string> = {
  course: "Formation",
  digital_file: "Fichier numérique",
  patron_pdf: "Patron PDF",
  bundle: "Pack",
};

export function ProductCard({ product }: { product: ShopProduct }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [added, setAdded] = useState(false);
  const image = product.images?.[0] ?? null;
  const outOfStock = product.stock != null && product.stock <= 0;

  function add() {
    startTransition(async () => {
      const res = await addToCart(product.id, 1);
      if (res.ok) {
        setAdded(true);
        toast("Ajouté au panier 🛒", "success");
        if (typeof window !== "undefined") window.dispatchEvent(new Event("cart:changed"));
        router.refresh();
      } else {
        toast(res.error ?? "Erreur", "error");
      }
    });
  }

  return (
    <div className="bg-white rounded-2xl border border-cream-200 overflow-hidden flex flex-col hover:shadow-lg transition-shadow">
      <div className="aspect-square bg-cream-100 flex items-center justify-center text-5xl overflow-hidden">
        {image ? <img src={image} alt={product.title} className="w-full h-full object-cover" /> : "🧵"}
      </div>
      <div className="p-4 flex flex-col flex-1">
        <span className="text-[11px] font-semibold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full w-fit mb-2">
          {TYPE_LABEL[product.type] ?? product.type}
        </span>
        <h3 className="font-semibold text-gray-900 font-dm line-clamp-2">{product.title}</h3>
        {product.description && (
          <p className="text-sm text-gray-500 font-dm line-clamp-2 mt-1">{product.description}</p>
        )}

        <div className="mt-3 flex items-center gap-2">
          <span className="font-bold text-orange-600 font-playfair text-lg">
            {Number(product.price).toLocaleString("fr-DZ")} DA
          </span>
          {product.compare_price != null && product.compare_price > product.price && (
            <span className="text-sm text-gray-400 line-through">
              {Number(product.compare_price).toLocaleString("fr-DZ")} DA
            </span>
          )}
        </div>

        {added ? (
          <Link href="/panier"
            className="mt-3 w-full inline-flex items-center justify-center gap-2 bg-violet-700 text-white py-2.5 rounded-xl font-semibold hover:bg-violet-800 transition-colors">
            🛒 Voir le panier
          </Link>
        ) : (
          <button onClick={add} disabled={isPending || outOfStock}
            className="mt-3 w-full bg-orange-DEFAULT text-white py-2.5 rounded-xl font-semibold hover:bg-orange-600 transition-colors disabled:opacity-50">
            {outOfStock ? "Épuisé" : isPending ? "Ajout…" : "Ajouter au panier"}
          </button>
        )}
      </div>
    </div>
  );
}
