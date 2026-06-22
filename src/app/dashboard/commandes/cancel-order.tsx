"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2 } from "lucide-react";
import { cancelMyOrder } from "@/app/actions/admin/payments";
import { toast } from "@/components/ui/toast";

/** Le client supprime sa commande (changement d'avis), tant qu'elle n'est pas traitée. */
export function CancelOrderButton({ orderId }: { orderId: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();

  function cancel() {
    if (!confirm("Annuler et supprimer cette commande ? Cette action est irréversible.")) return;
    start(async () => {
      const res = await cancelMyOrder(orderId);
      if (res.ok) { toast("Commande annulée ✅", "success"); router.refresh(); }
      else toast(res.error ?? "Erreur", "error");
    });
  }

  return (
    <button
      onClick={cancel}
      disabled={pending}
      className="inline-flex items-center gap-1.5 text-sm font-semibold text-red-600 hover:text-red-700 hover:underline disabled:opacity-60"
    >
      {pending ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
      Annuler
    </button>
  );
}
