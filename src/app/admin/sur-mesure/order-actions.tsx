"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Check, FileText, Receipt } from "lucide-react";
import { proposeCustomPrice, approveCustomPayment, getAdminCustomFileUrl } from "./actions";
import { toast } from "@/components/ui/toast";

export function AdminOrderActions({
  orderId, statut, proposedPrice, hasProof, hasFile,
}: {
  orderId: string;
  statut: string;
  proposedPrice: number | null;
  hasProof: boolean;
  hasFile: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [price, setPrice] = useState(proposedPrice ? String(proposedPrice) : "");

  function propose() {
    const n = Number(price);
    if (!Number.isFinite(n) || n <= 0) { toast("Prix invalide", "error"); return; }
    start(async () => {
      const r = await proposeCustomPrice(orderId, n);
      if (r.ok) { toast("Prix proposé ✅", "success"); router.refresh(); }
      else toast(r.error ?? "Erreur", "error");
    });
  }
  function approve() {
    if (!confirm("Valider le paiement et débloquer le téléchargement pour la cliente ?")) return;
    start(async () => {
      const r = await approveCustomPayment(orderId);
      if (r.ok) { toast("Paiement validé ✅", "success"); router.refresh(); }
      else toast(r.error ?? "Erreur", "error");
    });
  }
  async function view(kind: "proof" | "file") {
    const r = await getAdminCustomFileUrl(orderId, kind);
    if (r.ok) window.open(r.url, "_blank");
    else toast(r.error ?? "Indisponible", "error");
  }

  return (
    <div className="flex flex-col gap-2 min-w-[12rem]">
      {(statut === "price_requested" || statut === "price_proposed") && (
        <div className="flex items-center gap-1.5">
          <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Prix DA"
            className="w-24 rounded-lg border border-gray-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-violet-500" />
          <button onClick={propose} disabled={pending}
            className="inline-flex items-center gap-1 bg-violet-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-violet-800 disabled:opacity-50">
            {pending ? <Loader2 size={13} className="animate-spin" /> : null} {statut === "price_proposed" ? "Modifier" : "Proposer"}
          </button>
        </div>
      )}

      <div className="flex items-center gap-2">
        {hasFile && (
          <button onClick={() => view("file")} className="inline-flex items-center gap-1 text-xs text-violet-600 hover:underline">
            <FileText size={13} /> fichier
          </button>
        )}
        {hasProof && (
          <button onClick={() => view("proof")} className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline">
            <Receipt size={13} /> preuve
          </button>
        )}
      </div>

      {statut === "payment_review" && (
        <button onClick={approve} disabled={pending}
          className="inline-flex items-center justify-center gap-1.5 bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-green-700 disabled:opacity-50">
          {pending ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Valider le paiement
        </button>
      )}
    </div>
  );
}
