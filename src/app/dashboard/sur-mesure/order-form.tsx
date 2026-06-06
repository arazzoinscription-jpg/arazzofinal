"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Ruler, Loader2, Check } from "lucide-react";
import { placeCustomOrder, MESURE_FIELDS } from "./actions";

const field = "w-full rounded-xl border border-cream-200 dark:border-white/15 bg-white dark:bg-white/5 px-3.5 py-2.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500";
const label = "block text-sm font-medium text-gray-700 dark:text-white/80 mb-1.5";

export function CustomOrderForm() {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const router = useRouter();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const formEl = e.currentTarget;
    start(async () => {
      const res = await placeCustomOrder(fd);
      if (res.ok) { setDone(true); formEl.reset(); router.refresh(); setTimeout(() => setDone(false), 4000); }
      else setError(res.error || "Erreur");
    });
  }

  return (
    <form onSubmit={onSubmit} className="rounded-2xl bg-white dark:bg-white/[0.04] border border-cream-200 dark:border-white/10 p-5 sm:p-6 space-y-5">
      <div className="flex items-center gap-2 text-gray-900 dark:text-white">
        <Ruler size={20} className="text-violet-600 dark:text-violet-300" />
        <h2 className="font-semibold">Nouvelle commande sur mesure</h2>
      </div>

      {error && <div className="rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-red-700 dark:text-red-300 px-4 py-3 text-sm">{error}</div>}
      {done && <div className="rounded-xl bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/30 text-green-700 dark:text-green-300 px-4 py-3 text-sm flex items-center gap-2"><Check size={16} /> Commande envoyée au patronniste !</div>}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="sm:col-span-3">
          <label className={label}>Modèle souhaité *</label>
          <input name="titre" required className={field} placeholder="Ex. Robe de soirée fendue" />
        </div>
        <div>
          <label className={label}>Taille de référence</label>
          <input name="taille" className={field} placeholder="Ex. 40" />
        </div>
        <div className="sm:col-span-2">
          <label className={label}>Tissu souhaité</label>
          <input name="tissu" className={field} placeholder="Ex. Satin duchesse bordeaux" />
        </div>
      </div>

      <div>
        <p className={label}>Table de mesures (en cm)</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {MESURE_FIELDS.map((m) => (
            <div key={m}>
              <label className="block text-xs text-gray-500 dark:text-white/50 mb-1">{m}</label>
              <input name={`m_${m}`} type="number" min="0" step="0.5" className={field} placeholder="cm" />
            </div>
          ))}
        </div>
      </div>

      <div>
        <label className={label}>Note (optionnel)</label>
        <textarea name="note" rows={2} className={field} placeholder="Précisions, délais, inspiration…" />
      </div>

      <button type="submit" disabled={pending} className="inline-flex items-center gap-2 bg-orange-DEFAULT hover:bg-orange-600 disabled:opacity-60 text-white font-semibold px-6 py-3 rounded-xl transition-colors">
        {pending ? <Loader2 size={18} className="animate-spin" /> : <Ruler size={18} />}
        Envoyer ma commande sur mesure
      </button>
    </form>
  );
}
