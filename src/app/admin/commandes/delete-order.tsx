"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2 } from "lucide-react";
import { deleteOrderAdmin } from "@/app/actions/admin/payments";

/** Suppression définitive d'une commande (admin). */
export function DeleteOrderButton({ orderId, orderNumber }: { orderId: string; orderNumber: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();

  function remove() {
    if (!confirm(`Supprimer définitivement la commande ${orderNumber} ?\nCette action est irréversible (lignes, paiement et preuves seront effacés).`)) return;
    start(async () => {
      const res = await deleteOrderAdmin(orderId);
      if (!res.ok) { alert(res.error || "Erreur"); return; }
      router.refresh();
    });
  }

  return (
    <button
      onClick={remove}
      disabled={pending}
      title="Supprimer la commande"
      aria-label="Supprimer la commande"
      className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-60 transition-colors"
    >
      {pending ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={15} />}
    </button>
  );
}
