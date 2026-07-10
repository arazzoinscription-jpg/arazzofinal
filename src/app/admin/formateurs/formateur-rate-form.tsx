"use client";

import { useState, useTransition } from "react";
import { Percent, RotateCcw } from "lucide-react";
import { setFormateurIndividualRate } from "../actions";
import { toast } from "@/components/ui/toast";

/**
 * Réglage du taux de commission INDIVIDUEL d'un formateur (carte admin).
 * Vide = taux global. Le gain du formateur = CA × (1 − taux).
 */
export function FormateurRateForm({ userId, current, globalRate }: { userId: string; current: number | null; globalRate: number }) {
  const [value, setValue] = useState(current === null ? "" : String(current));
  const [isPending, startTransition] = useTransition();

  function save(v: string) {
    startTransition(async () => {
      const res = await setFormateurIndividualRate(userId, v === "" ? null : Number(v));
      if (res.ok) toast(v === "" ? `Taux global (${globalRate}%) rétabli` : `Taux réglé à ${v}%`, "success");
      else toast(res.error ?? "Erreur", "error");
    });
  }

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); save(value); }}
      className="mt-2 flex items-center gap-1.5 text-sm"
    >
      <span className="text-xs text-gray-400 inline-flex items-center gap-1"><Percent size={12} /> Commission :</span>
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        inputMode="decimal"
        placeholder={`${globalRate} (global)`}
        className="w-20 border border-gray-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
      />
      <button disabled={isPending}
        className="bg-violet-600 text-white text-xs font-semibold px-2.5 py-1.5 rounded-lg hover:bg-violet-700 disabled:opacity-50">
        OK
      </button>
      {current !== null && (
        <button type="button" disabled={isPending} title="Revenir au taux global"
          onClick={() => { setValue(""); save(""); }}
          className="text-gray-400 hover:text-gray-600 p-1"><RotateCcw size={14} /></button>
      )}
    </form>
  );
}
