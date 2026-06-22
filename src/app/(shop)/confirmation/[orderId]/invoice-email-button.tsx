"use client";

import { useState, useTransition } from "react";
import { emailInvoice } from "@/app/actions/emails";
import { toast } from "@/components/ui/toast";

/** Bouton « Envoyer ma facture par email » — (re)envoie le récapitulatif/facture au client. */
export function InvoiceEmailButton({ orderId }: { orderId: string }) {
  const [isPending, startTransition] = useTransition();
  const [sent, setSent] = useState(false);

  function send() {
    startTransition(async () => {
      const res = await emailInvoice(orderId);
      if (res.ok) {
        setSent(true);
        toast(`Facture envoyée à ${res.email}`, "success");
      } else {
        toast(res.error ?? "Envoi impossible", "error");
      }
    });
  }

  return (
    <button onClick={send} disabled={isPending || sent}
      className="w-full mt-3 inline-flex items-center justify-center gap-2 border-2 border-orange-DEFAULT text-orange-600 py-2.5 rounded-xl font-semibold text-sm hover:bg-orange-50 transition-colors disabled:opacity-60">
      {isPending ? "Envoi…" : sent ? "✓ Facture envoyée par email" : "✉️ Envoyer ma facture par email"}
    </button>
  );
}
