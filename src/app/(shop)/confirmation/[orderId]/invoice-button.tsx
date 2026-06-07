"use client";

import { useTransition } from "react";
import { FileText, Loader2 } from "lucide-react";
import { downloadInvoice } from "@/app/actions/invoices";
import { toast } from "@/components/ui/toast";

export function InvoiceButton({ invoiceId, invoiceNumber }: { invoiceId: string; invoiceNumber: string | null }) {
  const [pending, start] = useTransition();

  function open() {
    start(async () => {
      const res = await downloadInvoice(invoiceId);
      if (res.ok && res.url) window.open(res.url, "_blank");
      else toast(res.error ?? "Facture indisponible", "error");
    });
  }

  return (
    <button
      onClick={open}
      disabled={pending}
      className="inline-flex items-center gap-2 border-2 border-violet-600 text-violet-700 px-5 py-2.5 rounded-xl font-semibold hover:bg-violet-50 transition-colors disabled:opacity-60"
    >
      {pending ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
      Télécharger la facture{invoiceNumber ? ` ${invoiceNumber}` : ""}
    </button>
  );
}
