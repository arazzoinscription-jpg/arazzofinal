"use client";

import { useState, useTransition } from "react";
import { Loader2, RotateCcw, Save } from "lucide-react";
import { toast } from "@/components/ui/toast";
import { setGainsStartDate } from "@/app/admin/actions";

/** Réglage admin : date à partir de laquelle les gains sont comptabilisés. */
export function GainsDateForm({ initial }: { initial: string | null }) {
  const [date, setDate] = useState(initial ?? "");
  const [pending, start] = useTransition();

  function save(value: string | null) {
    start(async () => {
      const res = await setGainsStartDate(value);
      if (res.ok) { toast(value ? "Date de départ des gains enregistrée ✅" : "Remise à zéro annulée — tout est compté", "success"); }
      else toast(res.error ?? "Erreur", "error");
    });
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-6 max-w-xl">
      <h3 className="font-semibold text-gray-900 mb-1">📅 Point de départ des gains</h3>
      <p className="text-xs text-gray-500 mb-3">
        Les paiements <strong>avant</strong> cette date comptent <strong>0 DA</strong> dans tous les calculs de gains / CA
        (formateurs, patronnistes, tableaux de bord). Laisser vide = tout est compté.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
        <button onClick={() => save(date || null)} disabled={pending || !date}
          className="inline-flex items-center gap-1.5 bg-orange-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-orange-700 disabled:opacity-50">
          {pending ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Appliquer
        </button>
        {initial && (
          <button onClick={() => { setDate(""); save(null); }} disabled={pending}
            className="inline-flex items-center gap-1.5 border border-gray-200 text-gray-600 px-3 py-2 rounded-xl text-sm hover:bg-gray-50 disabled:opacity-50">
            <RotateCcw size={14} /> Réinitialiser
          </button>
        )}
      </div>
      {initial && <p className="text-[11px] text-gray-400 mt-2">Actuellement : gains comptés à partir du <strong>{initial}</strong>.</p>}
    </div>
  );
}
