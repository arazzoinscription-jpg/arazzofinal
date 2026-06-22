"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addMember, removeMember, searchStudents, staffCourses, staffPacks, courseEnrollees, addCourseMembers } from "../actions";

export interface Member {
  user_id: string;
  nom: string;
  email: string;
  avatar_url: string | null;
}
interface SearchResult {
  id: string;
  nom: string;
  email: string;
  avatar_url: string | null;
}

/** Recherche d'étudiants + ajout/retrait des membres d'un groupe. */
export function MembersManager({ groupId, members }: { groupId: string; members: Member[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, startSearch] = useTransition();
  const [isMutating, startMutate] = useTransition();
  const [err, setErr] = useState("");

  const memberIds = new Set(members.map((m) => m.user_id));

  // Import depuis une formation OU un pack — valeur encodée "course:ID" / "pack:ID"
  const [courses, setCourses] = useState<{ id: string; titre: string }[]>([]);
  const [packs, setPacks] = useState<{ id: string; titre: string }[]>([]);
  const [pick, setPick] = useState("");
  const [enrollees, setEnrollees] = useState<SearchResult[]>([]);
  const [loadingEnr, startEnr] = useTransition();

  useEffect(() => {
    staffCourses().then((r) => { if (r.ok) setCourses(r.courses); });
    staffPacks().then((r) => { if (r.ok) setPacks(r.packs); });
  }, []);

  function parsePick(v: string): { id: string; kind: "course" | "pack" } | null {
    const i = v.indexOf(":");
    if (i < 0) return null;
    const kind = v.slice(0, i) as "course" | "pack";
    return { id: v.slice(i + 1), kind };
  }

  function onPickCourse(v: string) {
    setPick(v);
    setEnrollees([]);
    const p = parsePick(v);
    if (!p) return;
    startEnr(async () => {
      const r = await courseEnrollees(p.id, p.kind);
      if (r.ok) setEnrollees(r.results as SearchResult[]);
    });
  }

  function addAll() {
    const p = parsePick(pick);
    if (!p) return;
    startMutate(async () => {
      const r = await addCourseMembers(groupId, p.id, p.kind);
      if (r.ok) router.refresh();
      else setErr(r.error ?? "Erreur");
    });
  }

  function doSearch(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    startSearch(async () => {
      const res = await searchStudents(query);
      if (res.ok) setResults(res.results as SearchResult[]);
      else setErr(res.error ?? "Erreur");
    });
  }

  function add(userId: string) {
    startMutate(async () => {
      const res = await addMember({ groupId, userId });
      if (res.ok) router.refresh();
      else setErr(res.error ?? "Erreur");
    });
  }

  function remove(userId: string) {
    startMutate(async () => {
      const res = await removeMember({ groupId, userId });
      if (res.ok) router.refresh();
      else setErr(res.error ?? "Erreur");
    });
  }

  return (
    <div className="bg-white rounded-2xl border border-cream-200 shadow-soft p-5">
      <h2 className="font-semibold text-gray-900 mb-3">Membres ({members.length})</h2>

      {/* Importer les inscrits d'un cours */}
      <div className="mb-4 rounded-xl bg-cream-50 border border-cream-200 p-3">
        <p className="text-xs font-semibold text-gray-500 mb-2">📚 Ajouter les inscrits d'une formation ou d'un pack</p>
        <div className="flex flex-col sm:flex-row gap-2">
          <select value={pick} onChange={(e) => onPickCourse(e.target.value)}
            className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-500">
            <option value="">— Choisir une formation ou un pack —</option>
            {courses.length > 0 && (
              <optgroup label="🎓 Formations">
                {courses.map((c) => <option key={c.id} value={`course:${c.id}`}>{c.titre}</option>)}
              </optgroup>
            )}
            {packs.length > 0 && (
              <optgroup label="📦 Packs">
                {packs.map((p) => <option key={p.id} value={`pack:${p.id}`}>{p.titre}</option>)}
              </optgroup>
            )}
          </select>
          <button onClick={addAll} disabled={!pick || isMutating || enrollees.length === 0}
            className="shiny-cta bg-violet-700 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-violet-800 transition-colors disabled:opacity-50 whitespace-nowrap">
            Ajouter tous ({enrollees.length})
          </button>
        </div>
        {loadingEnr && <p className="text-xs text-gray-400 mt-2">Chargement des inscrits…</p>}
        {pick && !loadingEnr && (
          <div className="mt-2 space-y-1 max-h-48 overflow-y-auto">
            {enrollees.length === 0 ? (
              <p className="text-xs text-gray-400">Aucun inscrit dans cette formation.</p>
            ) : enrollees.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg hover:bg-white">
                <div className="min-w-0">
                  <div className="text-sm text-gray-800 font-dm truncate">{r.nom}</div>
                  <div className="text-[11px] text-gray-400 truncate">{r.email}</div>
                </div>
                {memberIds.has(r.id) ? (
                  <span className="text-[11px] text-green-600 font-semibold flex-shrink-0">✓ Membre</span>
                ) : (
                  <button onClick={() => add(r.id)} disabled={isMutating}
                    className="text-[11px] bg-orange-50 text-orange-600 font-semibold px-2.5 py-1 rounded-lg hover:bg-orange-100 disabled:opacity-50 flex-shrink-0">
                    + Ajouter
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recherche */}
      <form onSubmit={doSearch} className="flex gap-2 mb-3">
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher un étudiant (nom ou email)…"
          className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
        <button type="submit" disabled={isSearching}
          className="bg-orange-DEFAULT text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-orange-600 transition-colors disabled:opacity-50">
          {isSearching ? "…" : "Chercher"}
        </button>
      </form>

      {/* Résultats de recherche */}
      {results.length > 0 && (
        <div className="mb-4 space-y-1.5">
          {results.map((r) => (
            <div key={r.id} className="flex items-center justify-between gap-2 p-2 rounded-lg hover:bg-cream-50">
              <div className="min-w-0">
                <div className="text-sm font-medium text-gray-800 font-dm truncate">{r.nom}</div>
                <div className="text-xs text-gray-400 truncate">{r.email}</div>
              </div>
              {memberIds.has(r.id) ? (
                <span className="text-xs text-green-600 font-semibold flex-shrink-0">✓ Membre</span>
              ) : (
                <button onClick={() => add(r.id)} disabled={isMutating}
                  className="text-xs bg-orange-50 text-orange-600 font-semibold px-3 py-1 rounded-lg hover:bg-orange-100 disabled:opacity-50 flex-shrink-0">
                  + Ajouter
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {err && <p className="text-sm text-red-500 mb-2">{err}</p>}

      {/* Liste des membres */}
      <div className="space-y-1.5">
        {members.length === 0 ? (
          <p className="text-sm text-gray-400 font-dm">Aucun membre. Recherchez des étudiants pour les ajouter.</p>
        ) : members.map((m) => (
          <div key={m.user_id} className="flex items-center justify-between gap-2 p-2 rounded-lg border border-cream-100">
            <div className="flex items-center gap-2 min-w-0">
              {m.avatar_url
                ? <img src={m.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                : <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-sm font-semibold">{(m.nom?.[0] ?? "?").toUpperCase()}</div>}
              <div className="min-w-0">
                <div className="text-sm font-medium text-gray-800 font-dm truncate">{m.nom}</div>
                <div className="text-xs text-gray-400 truncate">{m.email}</div>
              </div>
            </div>
            <button onClick={() => remove(m.user_id)} disabled={isMutating}
              className="text-xs text-red-400 hover:text-red-600 font-semibold flex-shrink-0 disabled:opacity-50">
              Retirer
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
