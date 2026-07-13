"use client";

import { useEffect, useState } from "react";
import { Plus, Check } from "lucide-react";
import { DEVOIRS_LIBRARY, type DevoirModele } from "@/lib/devoirs-library";

const LS_KEY = "arazzo_devoirs_perso";

function loadCustom(): DevoirModele[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr.filter((d) => d && typeof d.text === "string") : [];
  } catch { return []; }
}

/**
 * Liste déroulante de devoirs prêts à l'emploi + champ pour AJOUTER ses propres
 * devoirs. Les devoirs personnalisés sont mémorisés sur l'appareil (localStorage)
 * et réapparaissent dans la liste — aucune migration nécessaire.
 * `onPick(text)` remplit le champ « Devoir à faire ».
 */
export function DevoirPicker({ onPick }: { onPick: (text: string) => void }) {
  const [custom, setCustom] = useState<DevoirModele[]>([]);
  const [adding, setAdding] = useState(false);
  const [newText, setNewText] = useState("");

  useEffect(() => { setCustom(loadCustom()); }, []);

  function addCustom() {
    const t = newText.trim();
    if (!t) return;
    const label = t.split("\n")[0].slice(0, 40) + (t.length > 40 ? "…" : "");
    const next = [...custom, { label, text: t }];
    setCustom(next);
    try { localStorage.setItem(LS_KEY, JSON.stringify(next)); } catch { /* quota / navigation privée */ }
    onPick(t);            // applique aussi immédiatement au champ
    setNewText(""); setAdding(false);
  }

  const options = [...DEVOIRS_LIBRARY, ...custom];

  return (
    <div className="mb-2">
      <div className="flex items-center gap-2">
        <select
          value=""
          onChange={(e) => { const t = e.target.value; if (t) onPick(t); e.target.value = ""; }}
          className="flex-1 border border-violet-200 bg-violet-50/60 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
        >
          <option value="">➕ Choisir un devoir prêt à l'emploi…</option>
          {DEVOIRS_LIBRARY.length > 0 && (
            <optgroup label="Modèles Arazzo">
              {DEVOIRS_LIBRARY.map((d) => <option key={`lib-${d.label}`} value={d.text}>{d.label}</option>)}
            </optgroup>
          )}
          {custom.length > 0 && (
            <optgroup label="Mes devoirs">
              {custom.map((d, i) => <option key={`me-${i}`} value={d.text}>{d.label}</option>)}
            </optgroup>
          )}
        </select>
        <button type="button" onClick={() => setAdding((v) => !v)}
          title="Ajouter mon propre devoir à la liste"
          className="shrink-0 inline-flex items-center gap-1 text-xs font-semibold text-violet-700 border border-violet-200 rounded-lg px-2.5 py-2 hover:bg-violet-50">
          <Plus size={14} /> Ajouter
        </button>
      </div>

      {adding && (
        <div className="mt-2 rounded-lg border border-violet-200 bg-violet-50/40 p-2.5">
          <textarea
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            rows={2}
            placeholder="Écrivez un nouveau devoir à ajouter à votre liste (réutilisable)…"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 resize-y bg-white"
          />
          <div className="flex items-center justify-end gap-2 mt-2">
            <button type="button" onClick={() => { setAdding(false); setNewText(""); }}
              className="text-xs text-gray-500 px-2 py-1 hover:text-gray-700">Annuler</button>
            <button type="button" onClick={addCustom} disabled={!newText.trim()}
              className="inline-flex items-center gap-1 text-xs font-semibold bg-violet-600 text-white px-3 py-1.5 rounded-lg hover:bg-violet-700 disabled:opacity-50">
              <Check size={13} /> Ajouter à ma liste
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
