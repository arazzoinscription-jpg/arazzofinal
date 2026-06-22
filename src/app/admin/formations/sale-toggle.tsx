"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Store } from "lucide-react";
import { setCourseSale } from "../actions";

/** Toggle « mise en vente boutique » d'une formation — réservé à l'admin. */
export function SaleToggle({ courseId, onSale, published }: { courseId: string; onSale: boolean; published: boolean }) {
  const router = useRouter();
  const [on, setOn] = useState(onSale);
  const [isPending, startTransition] = useTransition();
  const [err, setErr] = useState("");

  function toggle() {
    setErr("");
    const next = !on;
    setOn(next);
    startTransition(async () => {
      const res = await setCourseSale(courseId, next);
      if (!res.ok) { setOn(!next); setErr(res.error ?? "Erreur"); }
      else router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-2">
      <button onClick={toggle} disabled={isPending || (!published && !on)} role="switch" aria-checked={on}
        title={!published ? "Publiez d'abord la formation" : on ? "Retirer de la vente" : "Mettre en vente"}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full transition-colors disabled:opacity-40 ${on ? "bg-orange-DEFAULT" : "bg-gray-300"}`}>
        <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform mt-0.5 ${on ? "translate-x-[22px]" : "translate-x-0.5"}`} />
      </button>
      <span className={`inline-flex items-center gap-1 text-xs font-semibold ${on ? "text-orange-600" : "text-gray-400"}`}>
        <Store size={13} /> {on ? "En vente" : "—"}
      </span>
      {err && <span className="text-[11px] text-red-500">{err}</span>}
    </div>
  );
}
