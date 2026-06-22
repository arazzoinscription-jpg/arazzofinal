"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Store, X, Check } from "lucide-react";
import { publishPack, unpublishProduct } from "@/app/formateur/boutique/actions";
import { toast } from "@/components/ui/toast";

export interface PackSellState {
  active: boolean;
  productId: string | null;
  currentPrice: number | null;
  defaultPrice: number;
}

/** Met un pack en vente dans la boutique (ou l'en retire) directement depuis la liste des packs. */
export function PackSellButton({ packId, sale }: { packId: string; sale: PackSellState }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [editing, setEditing] = useState(false);
  const [price, setPrice] = useState<number>(sale.currentPrice ?? sale.defaultPrice ?? 0);

  function publish() {
    start(async () => {
      const res = await publishPack(packId, price);
      if (res.ok) { toast("Pack mis en vente dans la boutique 🛒", "success"); setEditing(false); router.refresh(); }
      else toast(res.error ?? "Erreur", "error");
    });
  }
  function unpublish() {
    if (!sale.productId) return;
    start(async () => {
      const res = await unpublishProduct(sale.productId!);
      if (res.ok) { toast("Pack retiré de la boutique.", "success"); router.refresh(); }
      else toast(res.error ?? "Erreur", "error");
    });
  }

  if (sale.active) {
    return (
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700"><Check size={13} /> En vente</span>
        <button onClick={unpublish} disabled={pending}
          className="inline-flex items-center gap-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold px-2.5 py-1.5 transition-colors disabled:opacity-60">
          {pending ? <Loader2 size={13} className="animate-spin" /> : <X size={13} />} Retirer
        </button>
      </div>
    );
  }

  if (!editing) {
    return (
      <button onClick={() => setEditing(true)}
        className="inline-flex items-center gap-1.5 rounded-lg bg-orange-DEFAULT hover:bg-orange-600 text-white text-xs font-semibold px-2.5 py-1.5 transition-colors">
        <Store size={13} /> Mettre en vente
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <input type="number" min={0} value={price} onChange={(e) => setPrice(Number(e.target.value))}
          className="w-24 rounded-lg border border-cream-200 bg-white ps-2.5 pe-7 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
        <span className="absolute end-2 top-1/2 -translate-y-1/2 text-[11px] text-gray-400">DA</span>
      </div>
      <button onClick={publish} disabled={pending}
        className="inline-flex items-center gap-1.5 rounded-lg bg-orange-DEFAULT hover:bg-orange-600 text-white text-xs font-semibold px-2.5 py-1.5 disabled:opacity-60">
        {pending ? <Loader2 size={13} className="animate-spin" /> : <Store size={13} />} Confirmer
      </button>
      <button onClick={() => setEditing(false)} className="text-gray-400 hover:text-gray-600 text-xs">Annuler</button>
    </div>
  );
}
