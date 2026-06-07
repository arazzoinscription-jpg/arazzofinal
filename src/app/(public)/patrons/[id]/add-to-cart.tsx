"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ShoppingCart, Check, Loader2 } from "lucide-react";
import { addToCart } from "@/app/actions/cart";
import { toast } from "@/components/ui/toast";

export function AddPatronToCart({ productId }: { productId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [added, setAdded] = useState(false);

  function add() {
    start(async () => {
      const res = await addToCart(productId, 1);
      if (res.ok) { setAdded(true); toast("Ajouté au panier 🛒", "success"); router.refresh(); setTimeout(() => setAdded(false), 1500); }
      else toast(res.error ?? "Erreur", "error");
    });
  }

  return (
    <button onClick={add} disabled={pending}
      className="inline-flex items-center justify-center gap-2 bg-orange-DEFAULT text-white px-7 py-3.5 rounded-2xl font-bold text-lg hover:bg-orange-600 transition-colors disabled:opacity-60">
      {pending ? <Loader2 size={20} className="animate-spin" /> : added ? <Check size={20} /> : <ShoppingCart size={20} />}
      {added ? "Ajouté" : "Ajouter au panier"}
    </button>
  );
}
