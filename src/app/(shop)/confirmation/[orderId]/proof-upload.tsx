"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Upload, Loader2, Check } from "lucide-react";
import { submitCCPProof } from "@/app/actions/payments";
import { toast } from "@/components/ui/toast";

export function ProofUpload({ orderId }: { orderId: string }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [txId, setTxId] = useState("");
  const [pending, start] = useTransition();
  const [done, setDone] = useState(false);

  function send() {
    if (!file) { toast("Choisissez votre reçu (JPG, PNG ou PDF)", "error"); return; }
    start(async () => {
      const res = await submitCCPProof(orderId, file, txId || undefined);
      if (res.ok) { setDone(true); toast("Preuve envoyée ✅", "success"); router.refresh(); }
      else toast(res.error ?? "Envoi échoué", "error");
    });
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-green-200 bg-green-50 p-4 text-green-700 text-sm font-dm flex items-center gap-2">
        <Check size={16} /> Preuve envoyée — en attente de validation.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-cream-200 bg-white p-5">
      <h3 className="font-semibold text-gray-900 mb-1">Envoyer ma preuve de paiement</h3>
      <p className="text-sm text-gray-500 font-dm mb-4">Après votre versement CCP / BaridiMob, joignez le reçu (capture ou PDF).</p>

      <input
        value={txId}
        onChange={(e) => setTxId(e.target.value)}
        placeholder="N° de transaction (optionnel)"
        className="w-full border border-cream-200 rounded-xl px-4 py-2.5 mb-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
      />

      <div
        onClick={() => fileRef.current?.click()}
        className="border-2 border-dashed border-cream-300 rounded-xl p-5 text-center cursor-pointer hover:bg-cream-50 transition-colors"
      >
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,application/pdf" className="hidden"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        <div className="text-gray-400">
          <Upload size={22} className="mx-auto mb-1" />
          <p className="text-sm font-dm">{file ? file.name : "Cliquez pour joindre votre reçu (JPG, PNG, PDF · max 10 Mo)"}</p>
        </div>
      </div>

      <button onClick={send} disabled={pending}
        className="mt-4 w-full inline-flex items-center justify-center gap-2 bg-orange-DEFAULT text-white py-3 rounded-xl font-semibold hover:bg-orange-600 transition-colors disabled:opacity-60">
        {pending ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
        Envoyer ma preuve
      </button>
    </div>
  );
}
