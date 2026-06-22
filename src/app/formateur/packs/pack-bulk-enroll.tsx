"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Users, Loader2, Search, UserCheck, X } from "lucide-react";
import { listStudents, bulkEnrollPack, manualEnrollPack } from "@/app/formateur/cours/[id]/inscrits/actions";
import { toast } from "@/components/ui/toast";

interface Student { id: string; nom: string; email: string }

/**
 * Inscription au pack : sélection multiple d'élèves existants (avec « tout sélectionner »)
 * + ajout d'une nouvelle élève par email. Tout est inscrit à TOUS les cours du pack.
 */
export function PackBulkEnroll({ packId }: { packId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [list, setList] = useState<Student[]>([]);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [loading, startLoad] = useTransition();
  const [saving, startSave] = useTransition();
  // Ajout par email (nouvelle élève)
  const [email, setEmail] = useState("");
  const [nom, setNom] = useState("");
  const [adding, startAdd] = useTransition();

  function load(q: string) {
    startLoad(async () => {
      const r = await listStudents(q);
      if (r.ok) setList(r.results as Student[]);
    });
  }
  useEffect(() => { if (open && list.length === 0) load(""); /* eslint-disable-next-line */ }, [open]);

  const allSelected = list.length > 0 && list.every((s) => sel.has(s.id));
  function toggle(id: string) {
    setSel((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }
  function toggleAll() { setSel(() => (allSelected ? new Set() : new Set(list.map((s) => s.id)))); }

  function enrollSelected() {
    const ids = [...sel];
    if (!ids.length) { toast("Sélectionnez au moins une élève.", "error"); return; }
    startSave(async () => {
      const r = await bulkEnrollPack(packId, ids);
      if (r.ok) {
        toast(r.students ? `${r.students} élève(s) inscrite(s) au pack ✅` : "Élèves déjà inscrites.", "success");
        setSel(new Set());
        router.refresh();
      } else toast(r.error ?? "Erreur", "error");
    });
  }

  function addByEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) { toast("Saisissez l'email de l'élève.", "error"); return; }
    startAdd(async () => {
      const r = await manualEnrollPack({ packId, email: email.trim(), nom: nom.trim() || null });
      if (r.ok) {
        toast(`Élève inscrite au pack (${r.added} cours) ✓`, "success");
        setEmail(""); setNom("");
        router.refresh();
      } else toast(r.error ?? "Erreur", "error");
    });
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-violet-700 hover:text-violet-900">
        <Users size={15} /> Inscrire des élèves
      </button>
    );
  }

  const field = "border border-cream-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white w-full";

  return (
    <div className="mt-1 rounded-xl border border-cream-200 bg-cream-50/50 p-3">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-semibold text-gray-800 flex items-center gap-1.5"><Users size={15} className="text-violet-700" /> Inscrire des élèves au pack</h4>
        <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
      </div>

      {/* Recherche */}
      <form onSubmit={(e) => { e.preventDefault(); load(query); }} className="flex gap-2 mb-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute start-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher par nom ou email…"
            className={`${field} ps-8`} />
        </div>
        <button type="submit" className="border border-cream-200 text-gray-600 px-3 rounded-lg text-sm font-semibold hover:bg-cream-100">OK</button>
      </form>

      {/* Tout sélectionner + inscrire */}
      <div className="flex items-center justify-between gap-2 py-1.5 border-y border-cream-100">
        <label className="inline-flex items-center gap-2 text-sm font-semibold text-gray-700 cursor-pointer">
          <input type="checkbox" checked={allSelected} onChange={toggleAll} disabled={list.length === 0} className="w-4 h-4 accent-orange-600" />
          Tout ({list.length})
        </label>
        <button onClick={enrollSelected} disabled={saving || sel.size === 0}
          className="inline-flex items-center gap-1.5 bg-orange-DEFAULT text-white px-3 py-1.5 rounded-lg text-sm font-semibold hover:bg-orange-600 disabled:opacity-50">
          {saving ? <Loader2 size={14} className="animate-spin" /> : <UserCheck size={14} />} Inscrire ({sel.size})
        </button>
      </div>

      {/* Liste */}
      <div className="mt-1 max-h-56 overflow-y-auto divide-y divide-cream-50">
        {loading ? (
          <p className="text-sm text-gray-400 py-4 text-center">Chargement…</p>
        ) : list.length === 0 ? (
          <p className="text-sm text-gray-400 py-4 text-center">Aucune élève trouvée.</p>
        ) : list.map((s) => (
          <label key={s.id} className="flex items-center gap-2.5 px-1 py-2 hover:bg-cream-50 cursor-pointer">
            <input type="checkbox" checked={sel.has(s.id)} onChange={() => toggle(s.id)} className="w-4 h-4 accent-orange-600 flex-shrink-0" />
            <span className="w-7 h-7 rounded-full bg-violet-100 text-violet-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
              {(s.nom || s.email)[0]?.toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-gray-800 truncate">{s.nom}</div>
              <div className="text-xs text-gray-400 truncate">{s.email}</div>
            </div>
          </label>
        ))}
      </div>

      {/* Ajouter une nouvelle élève par email */}
      <form onSubmit={addByEmail} className="mt-3 pt-3 border-t border-cream-100 space-y-2">
        <p className="text-xs font-semibold text-gray-500">Ajouter une élève qui n'a pas encore de compte :</p>
        <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="Email de l'élève" className={field} />
        <input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Nom (si nouveau compte)" className={field} />
        <button type="submit" disabled={adding}
          className="inline-flex items-center gap-1.5 bg-violet-600 text-white px-3 py-1.5 rounded-lg text-sm font-semibold hover:bg-violet-700 disabled:opacity-60">
          {adding ? <Loader2 size={14} className="animate-spin" /> : <UserCheck size={14} />} Inscrire par email
        </button>
      </form>
    </div>
  );
}
