"use client";

import { useState, useTransition } from "react";
import { Loader2, Save } from "lucide-react";
import { toast } from "@/components/ui/toast";
import { saveEmailCategories } from "./actions";
import { EMAIL_CATEGORIES } from "./categories";

/**
 * Toggles par catégorie d'email : l'admin choisit ce que la plateforme envoie.
 * Catégorie décochée → sendEmail saute l'envoi (journalisé « skipped »).
 */
export function EmailPreferencesForm({ initial }: { initial: Record<string, boolean> }) {
  const [values, setValues] = useState<Record<string, boolean>>(() => {
    const v: Record<string, boolean> = {};
    for (const c of EMAIL_CATEGORIES) v[c.key] = initial[c.key] !== false; // absent = activé
    return v;
  });
  const [isPending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      const res = await saveEmailCategories(values);
      if (res.ok) toast("Préférences d'emails enregistrées", "success");
      else toast(res.error ?? "Erreur", "error");
    });
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <ul className="divide-y divide-gray-50">
        {EMAIL_CATEGORIES.map((c) => (
          <li key={c.key} className="flex items-start justify-between gap-4 px-5 py-4">
            <div className="min-w-0">
              <p className="font-semibold text-gray-900">{c.label}</p>
              <p className="text-sm text-gray-500 font-dm mt-0.5">{c.description}</p>
              <p className="text-xs text-gray-400 font-dm mt-1">Ex. : {c.examples}</p>
            </div>
            {/* Interrupteur */}
            <button
              type="button"
              role="switch"
              aria-checked={values[c.key]}
              onClick={() => setValues((v) => ({ ...v, [c.key]: !v[c.key] }))}
              className={`relative shrink-0 w-12 h-7 rounded-full transition-colors mt-1 ${
                values[c.key] ? "bg-violet-600" : "bg-gray-200"}`}
            >
              <span className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-all ${
                values[c.key] ? "start-6" : "start-1"}`} />
            </button>
          </li>
        ))}
      </ul>
      <div className="px-5 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between gap-3 flex-wrap">
        <p className="text-xs text-gray-400 font-dm">
          Les emails critiques (réinitialisation de mot de passe, liens d'accès) sont toujours envoyés.
        </p>
        <button onClick={save} disabled={isPending}
          className="inline-flex items-center gap-2 bg-violet-600 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-violet-700 disabled:opacity-50">
          {isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Enregistrer
        </button>
      </div>
    </div>
  );
}
