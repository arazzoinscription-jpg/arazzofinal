"use client";

import { useTransition } from "react";
import { generateInvoice, downloadInvoice } from "@/app/actions/invoices";
import { toast } from "@/components/ui/toast";

/** Ouvre la facture PDF (génère si nécessaire) dans un nouvel onglet. */
export function InvoiceButton({ orderId, invoiceId }: { orderId?: string; invoiceId?: string }) {
  const [isPending, startTransition] = useTransition();

  function open() {
    startTransition(async () => {
      const res = invoiceId ? await downloadInvoice(invoiceId) : orderId ? await generateInvoice(orderId) : { ok: false, error: "—" };
      if (res.ok && res.url) window.open(res.url, "_blank");
      else toast(res.error ?? "Facture indisponible", "error");
    });
  }

  return (
    <button onClick={open} disabled={isPending}
      className="text-sm font-semibold text-violet-DEFAULT hover:underline disabled:opacity-50">
      {isPending ? "…" : "📄 Facture"}
    </button>
  );
}
