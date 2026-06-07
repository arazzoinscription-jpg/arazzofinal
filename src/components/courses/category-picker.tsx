"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface Cat { id: string; parent_id: string | null; name_fr: string; ordre: number }

/** Sélecteur de catégories en arbre (cases à cocher). */
export function CategoryPicker({ value, onChange }: { value: string[]; onChange: (ids: string[]) => void }) {
  const [cats, setCats] = useState<Cat[]>([]);

  useEffect(() => {
    createClient()
      .from("categories")
      .select("id, parent_id, name_fr, ordre")
      .order("ordre", { ascending: true })
      .then(({ data }) => setCats((data as Cat[]) ?? []));
  }, []);

  const roots = cats.filter((c) => !c.parent_id).sort((a, b) => a.ordre - b.ordre);
  const childrenOf = (id: string) => cats.filter((c) => c.parent_id === id).sort((a, b) => a.ordre - b.ordre);
  const toggle = (id: string) => onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);

  function Node({ c, depth }: { c: Cat; depth: number }) {
    const kids = childrenOf(c.id);
    return (
      <div>
        <label className="flex items-center gap-2 py-1 text-sm cursor-pointer hover:bg-cream-50 rounded" style={{ paddingInlineStart: depth * 16 + 4 }}>
          <input type="checkbox" checked={value.includes(c.id)} onChange={() => toggle(c.id)} className="accent-orange-500 w-4 h-4" />
          <span className={depth === 0 ? "font-semibold text-gray-900" : depth === 1 ? "font-medium text-gray-700" : "text-gray-600"}>
            {c.name_fr}
          </span>
        </label>
        {kids.map((k) => <Node key={k.id} c={k} depth={depth + 1} />)}
      </div>
    );
  }

  if (cats.length === 0) return <p className="text-sm text-gray-400">Chargement des catégories…</p>;

  return (
    <div className="max-h-72 overflow-y-auto border border-cream-200 rounded-xl p-3 bg-white">
      {roots.map((r) => <Node key={r.id} c={r} depth={0} />)}
    </div>
  );
}
