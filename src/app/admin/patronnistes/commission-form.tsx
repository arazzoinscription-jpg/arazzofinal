"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Percent, Loader2 } from "lucide-react";
import { setCommissionRate, setFormateurCommissionRate } from "../actions";
import { toast } from "@/components/ui/toast";

/** Réglage d'un taux de commission de la plateforme (patron ou formateur). */
export function CommissionForm({ rate, scope = "patron", hint }: { rate: number; scope?: "patron" | "formateur"; hint?: string }) {
  const router = useRouter();
  const [value, setValue] = useState(String(rate));
  const [pending, start] = useTransition();

  function save() {
    const n = Number(value);
    if (!Number.isFinite(n) || n < 0 || n > 100) { toast("Taux invalide (0–100)", "error"); return; }
    start(async () => {
      const r = scope === "formateur" ? await setFormateurCommissionRate(n) : await setCommissionRate(n);
      if (r.ok) { toast("Taux de commission mis à jour ✅", "success"); router.refresh(); }
      else toast(r.error ?? "Erreur", "error");
    });
  }

  const defaultHint = scope === "formateur"
    ? "Appliqué aux ventes de formations. Le formateur gagne le montant payé × (1 − taux)."
    : "Appliqué à toutes les ventes (patrons + sur-mesure). Le patronniste gagne prix × (1 − taux).";

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-6 flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
        <Percent size={16} className="text-violet-600" /> Commission de la plateforme
      </div>
      <div className="flex items-center gap-1.5">
        <input type="number" min={0} max={100} step={0.5} value={value} onChange={(e) => setValue(e.target.value)}
          className="w-20 rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
        <span className="text-sm text-gray-500">%</span>
      </div>
      <button onClick={save} disabled={pending}
        className="inline-flex items-center gap-1.5 bg-violet-700 text-white px-4 py-1.5 rounded-lg text-sm font-semibold hover:bg-violet-800 disabled:opacity-50">
        {pending ? <Loader2 size={14} className="animate-spin" /> : null} Enregistrer
      </button>
      <span className="text-xs text-gray-400">{hint ?? defaultHint}</span>
    </div>
  );
}
