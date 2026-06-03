"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addMember, removeMember, searchStudents } from "../actions";

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

      {/* Recherche */}
      <form onSubmit={doSearch} className="flex gap-2 mb-3">
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher un étudiant (nom ou email)…"
          className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
        <button type="submit" disabled={isSearching}
          className="bg-violet-DEFAULT text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-violet-700 transition-colors disabled:opacity-50">
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
                  className="text-xs bg-violet-50 text-violet-DEFAULT font-semibold px-3 py-1 rounded-lg hover:bg-violet-100 disabled:opacity-50 flex-shrink-0">
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
                : <div className="w-8 h-8 rounded-full bg-violet-100 text-violet-DEFAULT flex items-center justify-center text-sm font-semibold">{(m.nom?.[0] ?? "?").toUpperCase()}</div>}
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
