"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Check, FileText, Receipt, Truck, PackageCheck } from "lucide-react";
import { proposeCustomPrice, approveCustomPayment, getAdminCustomFileUrl, setPlacementShipping } from "./actions";
import { toast } from "@/components/ui/toast";

export function AdminOrderActions({
  orderId, statut, proposedPrice, hasProof, hasFile, isPlacementPatron = false, paperPrice = null,
  paperDelivery = null,
}: {
  orderId: string;
  statut: string;
  proposedPrice: number | null;
  hasProof: boolean;
  hasFile: boolean;
  isPlacementPatron?: boolean;
  paperPrice?: number | null;
  /** Livraison papier : { statut, nom, wilaya } si la cliente a renseigné l'adresse. */
  paperDelivery?: { statut?: string; nom?: string; wilaya?: string } | null;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [price, setPrice] = useState(proposedPrice ? String(proposedPrice) : "");
  const [paper, setPaper] = useState(paperPrice ? String(paperPrice) : "");

  function propose() {
    const n = Number(price);
    if (!Number.isFinite(n) || n <= 0) { toast("Prix PDF invalide", "error"); return; }
    let paperN: number | undefined;
    if (isPlacementPatron) {
      paperN = Number(paper);
      if (!Number.isFinite(paperN) || paperN <= 0) { toast("Indiquez le prix papier imprimé", "error"); return; }
    }
    start(async () => {
      const r = await proposeCustomPrice(orderId, n, paperN);
      if (r.ok) { toast("Devis envoyé ✅", "success"); router.refresh(); }
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
  function ship(s: "expedie" | "livre") {
    start(async () => {
      const r = await setPlacementShipping(orderId, s);
      if (r.ok) { toast(s === "expedie" ? "Marqué expédié 📦" : "Marqué livré ✅", "success"); router.refresh(); }
      else toast(r.error ?? "Erreur", "error");
    });
  }

  return (
    <div className="flex flex-col gap-2 min-w-[12rem]">
      {(statut === "price_requested" || statut === "price_proposed") && (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5">
            <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder={isPlacementPatron ? "Prix PDF DA" : "Prix DA"}
              className="w-28 rounded-lg border border-gray-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-violet-500" />
            {isPlacementPatron && (
              <input type="number" value={paper} onChange={(e) => setPaper(e.target.value)} placeholder="Prix papier DA"
                className="w-28 rounded-lg border border-gray-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-orange-500" />
            )}
            <button onClick={propose} disabled={pending}
              className="inline-flex items-center gap-1 bg-violet-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-violet-800 disabled:opacity-50">
              {pending ? <Loader2 size={13} className="animate-spin" /> : null} {statut === "price_proposed" ? "Modifier" : "Proposer"}
            </button>
          </div>
          {isPlacementPatron && <span className="text-[10px] text-gray-400">Placement : prix PDF + prix papier imprimé</span>}
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

      {/* Livraison papier (placement) : expédier / livrer */}
      {paperDelivery && (
        <div className="flex flex-col gap-1.5 border-t border-gray-100 pt-2">
          <span className="text-[10px] text-gray-500">📦 {paperDelivery.nom} · {paperDelivery.wilaya}</span>
          {(!paperDelivery.statut || paperDelivery.statut === "a_expedier") && (
            <button onClick={() => ship("expedie")} disabled={pending}
              className="inline-flex items-center justify-center gap-1.5 bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-blue-700 disabled:opacity-50">
              <Truck size={13} /> Marquer expédié
            </button>
          )}
          {paperDelivery.statut === "expedie" && (
            <button onClick={() => ship("livre")} disabled={pending}
              className="inline-flex items-center justify-center gap-1.5 bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-green-700 disabled:opacity-50">
              <PackageCheck size={13} /> Marquer livré
            </button>
          )}
          {paperDelivery.statut === "livre" && <span className="text-xs font-medium text-green-600">Livré ✅</span>}
        </div>
      )}
    </div>
  );
}
