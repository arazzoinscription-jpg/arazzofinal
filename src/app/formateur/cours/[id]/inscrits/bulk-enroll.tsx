"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Users, Loader2, Search, UserCheck } from "lucide-react";
import { listStudents, bulkEnroll } from "./actions";
import { toast } from "@/components/ui/toast";

interface Student { id: string; nom: string; email: string }

/** Sélection multiple d'élèves (avec « tout sélectionner ») → inscription groupée au cours. */
export function BulkEnroll({ courseId, enrolledIds }: { courseId: string; enrolledIds: string[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [list, setList] = useState<Student[]>([]);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [loading, startLoad] = useTransition();
  const [saving, startSave] = useTransition();
  const enrolled = new Set(enrolledIds);

  function load(q: string) {
    startLoad(async () => {
      const r = await listStudents(q);
      if (r.ok) setList(r.results as Student[]);
    });
  }
  useEffect(() => { load(""); /* eslint-disable-next-line */ }, []);

  const selectable = list.filter((s) => !enrolled.has(s.id));
  const allSelected = selectable.length > 0 && selectable.every((s) => sel.has(s.id));

  function toggle(id: string) {
    setSel((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }
  function toggleAll() {
    setSel(() => (allSelected ? new Set() : new Set(selectable.map((s) => s.id))));
  }
  function enrollSelected() {
    const ids = [...sel];
    if (!ids.length) { toast("Sélectionnez au moins une élève.", "error"); return; }
    startSave(async () => {
      const r = await bulkEnroll(courseId, ids);
      if (r.ok) { toast(`${r.added} élève(s) inscrite(s) ✅`, "success"); setSel(new Set()); router.refresh(); }
      else toast(r.error ?? "Erreur", "error");
    });
  }

  return (
    <div className="bg-white rounded-2xl border border-cream-200 p-5 mb-6">
      <h2 className="font-semibold text-gray-900 mb-1 flex items-center gap-2">
        <Users size={18} className="text-violet-700" /> Inscrire plusieurs élèves
      </h2>
      <p className="text-sm text-gray-500 font-dm mb-4">
        Cochez les élèves (ou « Tout sélectionner ») et inscrivez-les d'un coup à cette formation.
      </p>

      {/* Recherche */}
      <form onSubmit={(e) => { e.preventDefault(); load(query); }} className="flex gap-2 mb-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute start-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher par nom ou email…"
            className="w-full border border-cream-200 rounded-xl ps-9 pe-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
        </div>
        <button type="submit" className="border border-cream-200 text-gray-600 px-4 rounded-xl text-sm font-semibold hover:bg-cream-50">Chercher</button>
      </form>

      {/* En-tête : tout sélectionner + bouton inscrire */}
      <div className="flex items-center justify-between gap-3 py-2 border-y border-cream-100">
        <label className="inline-flex items-center gap-2 text-sm font-semibold text-gray-700 cursor-pointer">
          <input type="checkbox" checked={allSelected} onChange={toggleAll} disabled={selectable.length === 0}
            className="w-4 h-4 accent-orange-600" />
          Tout sélectionner ({selectable.length})
        </label>
        <button onClick={enrollSelected} disabled={saving || sel.size === 0}
          className="inline-flex items-center gap-2 bg-orange-DEFAULT text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-orange-600 disabled:opacity-50 transition-colors">
          {saving ? <Loader2 size={15} className="animate-spin" /> : <UserCheck size={15} />}
          Inscrire la sélection ({sel.size})
        </button>
      </div>

      {/* Liste */}
      <div className="mt-2 max-h-80 overflow-y-auto divide-y divide-cream-50">
        {loading ? (
          <p className="text-sm text-gray-400 py-6 text-center">Chargement…</p>
        ) : list.length === 0 ? (
          <p className="text-sm text-gray-400 py-6 text-center">Aucune élève trouvée.</p>
        ) : list.map((s) => {
          const isEnrolled = enrolled.has(s.id);
          const checked = sel.has(s.id);
          return (
            <label key={s.id} className={`flex items-center gap-3 px-2 py-2.5 ${isEnrolled ? "opacity-60" : "hover:bg-cream-50 cursor-pointer"}`}>
              <input type="checkbox" checked={checked} disabled={isEnrolled} onChange={() => toggle(s.id)}
                className="w-4 h-4 accent-orange-600 flex-shrink-0" />
              <span className="w-8 h-8 rounded-full bg-violet-100 text-violet-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
                {(s.nom || s.email)[0]?.toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-gray-800 truncate">{s.nom}</div>
                <div className="text-xs text-gray-400 truncate">{s.email}</div>
              </div>
              {isEnrolled && <span className="text-[11px] font-semibold text-green-600 flex-shrink-0">✓ Déjà inscrite</span>}
            </label>
          );
        })}
      </div>
    </div>
  );
}
