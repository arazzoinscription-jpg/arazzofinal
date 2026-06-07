"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Check, Store, X } from "lucide-react";
import { publishCourse, publishPatron, unpublishProduct } from "./actions";

export interface SellItem {
  id: string;
  title: string;
  image: string | null;
  sourcePrice: number;
  productId: string | null;
  active: boolean;
  currentPrice: number | null;
}

function Row({ item, kind }: { item: SellItem; kind: "course" | "patron" }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [price, setPrice] = useState<number>(item.currentPrice ?? item.sourcePrice ?? 0);

  function publish() {
    start(async () => {
      const res = kind === "course" ? await publishCourse(item.id, price) : await publishPatron(item.id, price);
      if (!res.ok) alert(res.error || "Erreur");
      router.refresh();
    });
  }
  function unpublish() {
    if (!item.productId) return;
    start(async () => {
      const res = await unpublishProduct(item.productId!);
      if (!res.ok) alert(res.error || "Erreur");
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-4 rounded-2xl bg-white dark:bg-white/[0.04] border border-cream-200 dark:border-white/10 p-3">
      <div className="w-16 h-16 rounded-xl bg-cream-100 dark:bg-white/5 overflow-hidden flex-shrink-0">
        {item.image ? <img src={item.image} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-2xl">🧵</div>}
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-medium text-gray-900 dark:text-white line-clamp-1">{item.title}</div>
        {item.active && (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700 dark:text-green-300 mt-0.5">
            <Check size={12} /> En vente
          </span>
        )}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="relative">
          <input
            type="number" min="0" value={price}
            onChange={(e) => setPrice(Number(e.target.value))}
            className="w-28 rounded-lg border border-cream-200 dark:border-white/15 bg-white dark:bg-white/5 ps-3 pe-9 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
          <span className="absolute end-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">DA</span>
        </div>
        {item.active ? (
          <button onClick={unpublish} disabled={pending}
            className="inline-flex items-center gap-1.5 rounded-lg bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-700 dark:text-white text-sm font-semibold px-3 py-2 transition-colors disabled:opacity-60">
            {pending ? <Loader2 size={15} className="animate-spin" /> : <X size={15} />} Retirer
          </button>
        ) : (
          <button onClick={publish} disabled={pending}
            className="inline-flex items-center gap-1.5 rounded-lg bg-orange-DEFAULT hover:bg-orange-600 text-white text-sm font-semibold px-3 py-2 transition-colors disabled:opacity-60">
            {pending ? <Loader2 size={15} className="animate-spin" /> : <Store size={15} />} Mettre en vente
          </button>
        )}
      </div>
    </div>
  );
}

export function SellList({ courses, patrons }: { courses: SellItem[]; patrons: SellItem[] }) {
  return (
    <div className="space-y-10">
      {courses.length > 0 && (
        <section>
          <h2 className="font-playfair text-xl font-bold text-gray-900 dark:text-white mb-4">Mes formations</h2>
          <div className="space-y-3">{courses.map((c) => <Row key={c.id} item={c} kind="course" />)}</div>
        </section>
      )}

      <section>
        <h2 className="font-playfair text-xl font-bold text-gray-900 dark:text-white mb-4">Patrons</h2>
        {patrons.length === 0 ? (
          <p className="text-sm text-gray-400">Aucun patron.</p>
        ) : (
          <div className="space-y-3">{patrons.map((p) => <Row key={p.id} item={p} kind="patron" />)}</div>
        )}
      </section>
    </div>
  );
}
