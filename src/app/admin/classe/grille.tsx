"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import {
  LIBELLE_TEINTE, TEINTES, compterTeintes, filtrerCartes,
  type CarteEleve, type FiltresClasse, type Teinte,
} from "@/lib/classe/vue";
import type { CodeNiveau } from "@/lib/student-care/levels";
import { CarteEleveVue } from "./carte";
import { STYLE_TEINTE } from "./teintes";

const PAS = 60;
const NIVEAUX: CodeNiveau[] = ["N1", "N2", "N3"];

/** Grille de la classe : recherche + filtres instantanés, gardés dans l'adresse (partageable). */
export function GrilleClasse({ cartes, initiaux, base }: { cartes: CarteEleve[]; initiaux: FiltresClasse; base: string }) {
  const [q, setQ] = useState(initiaux.q);
  const [niveau, setNiveau] = useState<CodeNiveau | null>(initiaux.niveau);
  const [t, setT] = useState<Teinte | null>(initiaux.teinte);
  const [limite, setLimite] = useState(PAS);

  // Les compteurs de statut suivent la recherche et le niveau (pas le filtre de statut lui-même).
  const avantStatut = useMemo(() => filtrerCartes(cartes, { q, niveau, teinte: null }), [cartes, q, niveau]);
  const compte = useMemo(() => compterTeintes(avantStatut), [avantStatut]);
  const liste = useMemo(() => (t ? avantStatut.filter((c) => c.teinte === t) : avantStatut), [avantStatut, t]);

  useEffect(() => { setLimite(PAS); }, [q, niveau, t]);
  useEffect(() => {
    const garder: Record<string, string> = {};
    new URLSearchParams(window.location.search).forEach((v, k) => { if (!["q", "niveau", "teinte"].includes(k)) garder[k] = v; });
    if (q.trim()) garder.q = q.trim();
    if (niveau) garder.niveau = niveau;
    if (t) garder.teinte = t;
    const s = new URLSearchParams(garder).toString();
    window.history.replaceState(null, "", `${window.location.pathname}${s ? `?${s}` : ""}`);
  }, [q, niveau, t]);

  const puce = (actif: boolean) => `inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${actif ? "bg-[#5B16F9] border-[#5B16F9] text-white shadow-sm" : "bg-white hover:bg-gray-50"}`;

  return (
    <div>
      <div className="bg-white rounded-2xl border border-gray-100 p-3 sm:p-4 mb-5 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
          <label className="relative flex-1">
            <span className="sr-only">Rechercher une élève par son nom</span>
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden />
            <input
              value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher une élève…"
              className="w-full rounded-xl border border-gray-200 pl-9 pr-9 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#5B16F9]/40"
            />
            {q ? (
              <button type="button" onClick={() => setQ("")} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-700" aria-label="Effacer la recherche"><X size={16} /></button>
            ) : null}
          </label>
          <div className="flex gap-1.5" role="group" aria-label="Filtrer par niveau">
            <button type="button" className={puce(niveau === null)} onClick={() => setNiveau(null)} aria-pressed={niveau === null}>Tous niveaux</button>
            {NIVEAUX.map((n) => (
              <button key={n} type="button" className={puce(niveau === n)} onClick={() => setNiveau(niveau === n ? null : n)} aria-pressed={niveau === n}>{n}</button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrer par situation">
          <button type="button" className={puce(t === null)} onClick={() => setT(null)} aria-pressed={t === null}>
            Toutes <span className={t === null ? "text-white/80" : "text-gray-400"}>{avantStatut.length}</span>
          </button>
          {TEINTES.map((x) => (
            <button key={x} type="button" onClick={() => setT(t === x ? null : x)} aria-pressed={t === x}
              className={t === x ? puce(true) : `${puce(false)} ${STYLE_TEINTE[x].puce}`}>
              <span className={`w-2 h-2 rounded-full ${STYLE_TEINTE[x].point}`} aria-hidden />
              {LIBELLE_TEINTE[x]} <span className={t === x ? "text-white/80" : "opacity-60"}>{compte[x]}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-baseline justify-between mb-3">
        <p className="text-sm text-gray-500 font-dm">{liste.length} élève{liste.length > 1 ? "s" : ""}{liste.length !== cartes.length ? ` sur ${cartes.length}` : ""}</p>
        {(q || niveau || t) ? (
          <button type="button" className="text-xs text-[#5B16F9] hover:underline" onClick={() => { setQ(""); setNiveau(null); setT(null); }}>Effacer les filtres</button>
        ) : null}
      </div>

      {liste.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-gray-200 text-center py-14 text-gray-500">
          <div className="text-4xl mb-2" aria-hidden>🪑</div>
          Aucune élève ne correspond à ces filtres.
        </div>
      ) : (
        <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 sm:gap-4">
          {liste.slice(0, limite).map((c) => <li key={c.id}><CarteEleveVue c={c} base={base} /></li>)}
        </ul>
      )}
      {liste.length > limite ? (
        <div className="text-center mt-5">
          <button type="button" onClick={() => setLimite((l) => l + PAS)} className="rounded-xl border border-gray-200 bg-white px-5 py-2 text-sm font-semibold hover:bg-gray-50">
            Afficher plus ({liste.length - limite} restantes)
          </button>
        </div>
      ) : null}
    </div>
  );
}
