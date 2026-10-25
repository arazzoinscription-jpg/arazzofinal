"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, Play, X, Plus, Loader2, Film, Clock, CheckSquare } from "lucide-react";
import { cocherPlage, filtrerLecons, plusRecentes, type LeconBiblio } from "@/lib/lecons/bibliotheque";
import { resolveEmbed } from "@/components/player/bunny-player";
import { listerLecons } from "@/app/formateur/lecons/actions";

const PAR_PAGE = 100;
const date = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }) : null;

/**
 * Fenêtre « Ajouter une leçon » de l'éditeur de cours : une leçon vide, OU des leçons déjà créées (les plus récentes
 * en haut) cochées en masse — « Tout cocher », ou Maj + clic pour toute une plage — puis ajoutées d'un coup au
 * chapitre (dans l'ordre de leur cours d'origine ; réordonnables ensuite avec ↑ ↓).
 */
export function ChoisirLecons({ onFermer, onVide, onAjouter, videosDuCours = [], charger = listerLecons }: {
  onFermer: () => void;
  onVide: () => void;
  onAjouter: (lecons: LeconBiblio[]) => void;
  /** Vidéos déjà présentes dans le cours en cours d'édition (badge « Déjà dans ce cours »). */
  videosDuCours?: string[];
  /** Lecture des leçons (par défaut : celles que la personne connectée peut reprendre). */
  charger?: () => Promise<{ ok: true; lecons: LeconBiblio[] } | { ok: false; error: string }>;
}) {
  const [lecons, setLecons] = useState<LeconBiblio[] | null>(null);
  const [erreur, setErreur] = useState("");
  const [recherche, setRecherche] = useState("");
  const [coursId, setCoursId] = useState("");
  const [selection, setSelection] = useState<string[]>([]);
  const [dernier, setDernier] = useState<number | null>(null);
  const [ouverte, setOuverte] = useState<string | null>(null);
  const [nb, setNb] = useState(PAR_PAGE);

  useEffect(() => {
    let actif = true;
    charger().then((r) => {
      if (!actif) return;
      if (r.ok) setLecons(r.lecons);
      else setErreur(r.error);
    }).catch(() => actif && setErreur("Impossible de charger les leçons. Réessayez."));
    return () => { actif = false; };
  }, [charger]);

  // Fermer avec Échap.
  useEffect(() => {
    const f = (e: KeyboardEvent) => { if (e.key === "Escape") onFermer(); };
    window.addEventListener("keydown", f);
    return () => window.removeEventListener("keydown", f);
  }, [onFermer]);

  const rang = useMemo(() => new Map((lecons ?? []).map((l, i) => [l.id, i])), [lecons]);
  const recentes = useMemo(() => plusRecentes(lecons ?? []), [lecons]);
  const cours = useMemo(() => {
    const vus = new Map<string, string>();
    for (const l of lecons ?? []) if (!vus.has(l.coursId)) vus.set(l.coursId, l.coursTitre);
    return [...vus].map(([id, titre]) => ({ id, titre }));
  }, [lecons]);
  const visibles = useMemo(() => filtrerLecons(recentes, { recherche, coursId }), [recentes, recherche, coursId]);
  const ids = useMemo(() => visibles.map((l) => l.id), [visibles]);
  const dejaLa = useMemo(() => new Set(videosDuCours.map((v) => v.trim()).filter(Boolean)), [videosDuCours]);
  const toutesCochees = ids.length > 0 && ids.every((id) => selection.includes(id));

  function cocher(i: number, maj: boolean) {
    setSelection((s) => cocherPlage(s, ids, maj ? dernier : null, i));
    setDernier(i);
  }
  function toutCocher() {
    setSelection((s) => (toutesCochees ? s.filter((id) => !ids.includes(id)) : [...s, ...ids.filter((id) => !s.includes(id))]));
  }
  function ajouter() {
    const choisies = selection.map((id) => (lecons ?? []).find((l) => l.id === id)).filter((l): l is LeconBiblio => !!l)
      .sort((a, b) => (rang.get(a.id) ?? 0) - (rang.get(b.id) ?? 0));
    onAjouter(choisies);
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center sm:p-4" onClick={onFermer}>
      <div className="w-full sm:max-w-2xl h-[92vh] sm:h-[85vh] flex flex-col bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Ajouter des leçons">
        {/* En-tête : leçon vide, recherche, filtre */}
        <div className="p-4 sm:p-5 border-b border-cream-200 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-playfair text-xl font-bold text-gray-900">Ajouter des leçons</h2>
            <button type="button" onClick={onFermer} aria-label="Fermer" className="p-1.5 rounded-full text-gray-400 hover:bg-gray-100"><X size={20} /></button>
          </div>
          <button type="button" onClick={onVide}
            className="w-full inline-flex items-center justify-center gap-2 border-2 border-dashed border-orange-300 text-orange-700 hover:bg-orange-50 rounded-xl py-2.5 text-sm font-semibold transition-colors">
            <Plus size={16} /> Nouvelle leçon vide
          </button>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 pt-1">… ou reprendre des leçons créées dernièrement</p>
          <div className="flex flex-col sm:flex-row gap-2">
            <label className="relative flex-1">
              <Search size={15} className="absolute start-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={recherche} onChange={(e) => { setRecherche(e.target.value); setNb(PAR_PAGE); setDernier(null); }}
                placeholder="Chercher une leçon, un cours…" autoFocus
                className="w-full ps-9 pe-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
            </label>
            <select value={coursId} onChange={(e) => { setCoursId(e.target.value); setNb(PAR_PAGE); setDernier(null); }}
              className="sm:w-56 py-2 px-3 rounded-xl border border-gray-200 text-sm bg-white">
              <option value="">Tous les cours</option>
              {cours.map((c) => <option key={c.id} value={c.id}>{c.titre}</option>)}
            </select>
          </div>
          {lecons ? (
            <div className="flex items-center justify-between gap-2 text-xs text-gray-500">
              <span>{visibles.length} leçon{visibles.length > 1 ? "s" : ""} · Maj + clic pour cocher toute une plage</span>
              {ids.length > 0 ? (
                <button type="button" onClick={toutCocher} className="inline-flex items-center gap-1 font-semibold text-orange-600 hover:underline">
                  <CheckSquare size={13} /> {toutesCochees ? "Tout décocher" : `Tout cocher (${ids.length})`}
                </button>
              ) : null}
            </div>
          ) : null}
        </div>

        {/* Liste */}
        <div className="flex-1 overflow-y-auto">
          {erreur ? (
            <p className="m-5 text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">{erreur}</p>
          ) : !lecons ? (
            <div className="h-full flex items-center justify-center gap-2 text-gray-400 text-sm"><Loader2 size={18} className="animate-spin" /> Chargement des leçons…</div>
          ) : visibles.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-16">Aucune leçon ne correspond.</p>
          ) : (
            <ul className="divide-y divide-cream-100">
              {visibles.slice(0, nb).map((l, i) => {
                const rangSel = selection.indexOf(l.id);
                const video = l.video ? resolveEmbed(l.video).src : undefined;
                return (
                  <li key={l.id} className={rangSel >= 0 ? "bg-orange-50/70" : ""}>
                    <div className="flex items-center gap-3 px-4 py-2.5 cursor-pointer select-none" onClick={(e) => cocher(i, e.shiftKey)}>
                      <input type="checkbox" checked={rangSel >= 0} readOnly tabIndex={-1} aria-label={`Sélectionner « ${l.titre} »`}
                        className="w-5 h-5 shrink-0 accent-orange-600 pointer-events-none" />
                      <button type="button" disabled={!video} aria-label={video ? `Voir la vidéo « ${l.titre} »` : "Pas de vidéo"}
                        onClick={(e) => { e.stopPropagation(); setOuverte(ouverte === l.id ? null : l.id); }}
                        className="relative w-20 aspect-video shrink-0 rounded-md overflow-hidden bg-gradient-to-br from-violet-100 to-orange-100 disabled:cursor-default group">
                        {l.miniature ? (
                          <img src={l.miniature} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover"
                            onError={(e) => { e.currentTarget.style.display = "none"; }} />
                        ) : null}
                        <span className="absolute inset-0 flex items-center justify-center">
                          {video ? (
                            <span className="w-6 h-6 rounded-full bg-black/45 group-hover:bg-orange-600 flex items-center justify-center transition-colors">
                              <Play size={11} className="text-white fill-white ms-0.5" />
                            </span>
                          ) : <Film size={15} className="text-gray-400" />}
                        </span>
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 line-clamp-1">{l.titre}</p>
                        <p className="text-[11px] text-gray-400 flex flex-wrap items-center gap-x-2 mt-0.5">
                          <span className="truncate max-w-[14rem]">{l.coursTitre}</span>
                          {date(l.creeLe) ? <span>créée le {date(l.creeLe)}</span> : null}
                          {l.duree ? <span className="inline-flex items-center gap-0.5"><Clock size={10} />{l.duree} min</span> : null}
                          {l.video && dejaLa.has(l.video) ? <span className="text-violet-600 font-semibold">Déjà dans ce cours</span> : null}
                          {!l.video ? <span className="italic">Pas de vidéo</span> : null}
                        </p>
                      </div>
                    </div>
                    {ouverte === l.id && video ? (
                      <div className="px-4 pb-3">
                        <div className="relative aspect-video rounded-lg overflow-hidden bg-black">
                          <iframe src={video} title={l.titre} className="absolute inset-0 w-full h-full border-0"
                            allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture" allowFullScreen />
                        </div>
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
          {lecons && visibles.length > nb ? (
            <div className="p-4 text-center">
              <button type="button" onClick={() => setNb(nb + PAR_PAGE)} className="text-sm font-semibold text-orange-600 hover:underline">
                Voir plus ({visibles.length - nb} restantes)
              </button>
            </div>
          ) : null}
        </div>

        {/* Pied : ajouter la sélection */}
        <div className="p-4 border-t border-cream-200 bg-cream-50/60 flex flex-wrap items-center justify-between gap-3">
          <span className="text-sm text-gray-600">
            {selection.length > 0 ? <><strong>{selection.length}</strong> leçon{selection.length > 1 ? "s" : ""} cochée{selection.length > 1 ? "s" : ""}</> : "Cochez les leçons à ajouter"}
          </span>
          <div className="flex items-center gap-2">
            {selection.length > 0 ? (
              <button type="button" onClick={() => { setSelection([]); setDernier(null); }} className="text-sm text-gray-500 hover:text-gray-800 px-2 py-2">Vider</button>
            ) : null}
            <button type="button" onClick={ajouter} disabled={selection.length === 0}
              className="inline-flex items-center gap-2 bg-orange-DEFAULT hover:bg-orange-600 disabled:opacity-40 text-white px-5 py-2.5 rounded-xl font-semibold transition-colors">
              <Plus size={17} /> Ajouter {selection.length > 0 ? `${selection.length} leçon${selection.length > 1 ? "s" : ""}` : "les leçons"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
