"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Upload, Loader2, Check, Receipt } from "lucide-react";
import { uploadPaymentProof } from "@/lib/upload-proof";
import { toast } from "@/components/ui/toast";

/**
 * Bouton + formulaire d'envoi de preuve de paiement, intégré à la liste
 * « Mes commandes ». Visible pour les commandes CCP / virement en attente.
 */
export function ProofCTA({ orderId, alreadySent }: { orderId: string; alreadySent: boolean }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [txId, setTxId] = useState("");
  const [pending, start] = useTransition();
  const [done, setDone] = useState(false);

  function send() {
    if (!file) { toast("Choisissez votre reçu (JPG, PNG ou PDF)", "error"); return; }
    start(async () => {
      try {
        const res = await uploadPaymentProof(orderId, file, txId || undefined);
        if (res.ok) { setDone(true); toast("Preuve envoyée ✅", "success"); router.refresh(); }
        else toast(res.error ?? "Envoi échoué", "error");
      } catch (e) {
        toast((e as Error)?.message || "Envoi échoué", "error");
      }
    });
  }

  if (done || alreadySent) {
    return (
      <div className="mt-3 rounded-xl border border-blue-200 bg-blue-50 p-3 text-blue-700 text-sm font-dm flex items-center gap-2">
        <Check size={15} /> Preuve envoyée — en attente de validation par l'équipe.
      </div>
    );
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mt-3 w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-orange-DEFAULT text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-orange-600 transition-colors"
      >
        <Receipt size={17} /> Envoyer ma preuve de paiement
      </button>
    );
  }

  return (
    <div className="mt-3 rounded-xl border border-cream-200 bg-cream-50/60 p-4">
      <p className="text-sm text-gray-600 font-dm mb-3">
        Après votre versement CCP / BaridiMob, joignez le reçu (capture d'écran ou PDF).
      </p>
      <input
        value={txId}
        onChange={(e) => setTxId(e.target.value)}
        placeholder="N° de transaction (optionnel)"
        className="w-full border border-cream-200 rounded-xl px-4 py-2.5 mb-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
      />
      <div
        onClick={() => fileRef.current?.click()}
        className="border-2 border-dashed border-cream-300 rounded-xl p-5 text-center cursor-pointer hover:bg-white transition-colors"
      >
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,application/pdf" className="hidden"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        <div className="text-gray-400">
          <Upload size={22} className="mx-auto mb-1" />
          <p className="text-sm font-dm">{file ? file.name : "Cliquez pour joindre votre reçu (JPG, PNG, PDF · max 10 Mo)"}</p>
        </div>
      </div>
      <div className="flex gap-2 mt-4">
        <button onClick={send} disabled={pending}
          className="flex-1 inline-flex items-center justify-center gap-2 bg-orange-DEFAULT text-white py-2.5 rounded-xl font-semibold hover:bg-orange-600 transition-colors disabled:opacity-60">
          {pending ? <Loader2 size={17} className="animate-spin" /> : <Upload size={17} />}
          Envoyer
        </button>
        <button onClick={() => setOpen(false)} disabled={pending}
          className="px-4 py-2.5 rounded-xl border border-cream-200 text-gray-500 text-sm font-semibold hover:bg-white">
          Annuler
        </button>
      </div>
    </div>
  );
}
