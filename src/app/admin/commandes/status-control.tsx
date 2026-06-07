"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2 } from "lucide-react";
import { setOrderStatus } from "@/app/actions/admin/payments";

const OPTIONS: { value: string; label: string }[] = [
  { value: "pending", label: "En attente" },
  { value: "payment_pending", label: "Paiement attendu" },
  { value: "payment_review", label: "Vérification" },
  { value: "confirmed", label: "Confirmée" },
  { value: "shipped", label: "Expédiée" },
  { value: "delivered", label: "Terminée / Livrée" },
  { value: "cancelled", label: "Annulée" },
  { value: "refunded", label: "Remboursée" },
];

export function OrderStatusControl({ orderId, current }: { orderId: string; current: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();

  function apply(status: string) {
    if (status === current) return;
    start(async () => {
      const res = await setOrderStatus(orderId, status);
      if (!res.ok) alert(res.error || "Erreur");
      router.refresh();
    });
  }

  const done = current === "delivered";

  return (
    <div className="flex items-center gap-2">
      <select
        defaultValue={current}
        disabled={pending}
        onChange={(e) => apply(e.target.value)}
        className="rounded-lg border border-cream-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-60"
      >
        {OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      {!done && (
        <button
          onClick={() => apply("delivered")}
          disabled={pending}
          title="Marquer comme terminée"
          className="inline-flex items-center gap-1 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs font-semibold px-2.5 py-1.5 transition-colors disabled:opacity-60"
        >
          {pending ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />} Terminer
        </button>
      )}
    </div>
  );
}
