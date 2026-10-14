"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { MessageCircle, Search, UserRound, X } from "lucide-react";
import type { EnseignanteClasse, PersonneClasse } from "@/lib/classe/classe-eleve";
import { normaliser } from "@/lib/classe/vue";
import { ouvrirMessagerie } from "@/lib/classe/ouvrir-messagerie";
import { PastillePresence, useEnseignantesEnLigne } from "@/components/presence/presence";
import { ActiviteDe, ChoixActivite, PointEnLigne, StylesActivite } from "@/components/presence/activite";

const PAS = 48;

function Photo({ nom, initiales, avatar, taille }: { nom: string; initiales: string; avatar: string | null; taille: "lg" | "md" }) {
  const dim = taille === "lg" ? "w-28 h-28 text-4xl" : "w-16 h-16 text-xl";
  return (
    <div className={`${dim} rounded-full overflow-hidden flex-shrink-0 bg-gradient-to-br from-[#5B16F9] to-[#2A0880] text-white font-playfair font-bold flex items-center justify-center`}>
      {avatar
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={avatar} alt={`Photo de ${nom}`} className="w-full h-full object-cover" loading="lazy" referrerPolicy="no-referrer" />
        : <span aria-label={`Initiales de ${nom}`}>{initiales}</span>}
    </div>
  );
}

/** « Ma classe » côté élève : enseignante(s) en haut, puis les camarades DE SES GROUPES (jamais le suivi). */
export function ClasseEleveVue({ enseignantes, camarades, niveaux, groupes }: {
  enseignantes: EnseignanteClasse[]; camarades: PersonneClasse[]; niveaux: string[];
  groupes: { id: string; nom: string; nb: number }[];
}) {
  const presence = useEnseignantesEnLigne();
  const [q, setQ] = useState("");
  const [niveau, setNiveau] = useState<string | null>(null);
  const [groupe, setGroupe] = useState<string | null>(null);
  const [limite, setLimite] = useState(PAS);
  const liste = useMemo(() => {
    const n = normaliser(q);
    return camarades.filter((c) => (!n || c.cle.includes(n)) && (!niveau || c.niveaux.includes(niveau)) && (!groupe || c.groupes.includes(groupe)));
  }, [camarades, q, niveau, groupe]);
  const puce = (actif: boolean) => `rounded-full border px-3 py-1.5 text-xs font-semibold transition ${actif ? "bg-[#5B16F9] border-[#5B16F9] text-white" : "bg-white border-gray-200 hover:bg-gray-50 text-gray-700"}`;

  return (
    <div>
      {/* L'enseignante, en haut : photo, présence en temps réel, profil et message. */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#2A0880] via-[#3f10c2] to-[#5B16F9] text-white px-5 sm:px-8 py-6 mb-6 shadow-lg">
        <div className="absolute -right-10 -top-10 w-48 h-48 rounded-full bg-white/10" aria-hidden />
        <p className="relative text-xs uppercase tracking-[0.2em] text-white/70 font-dm">Arazzo · Classe virtuelle</p>
        {enseignantes.length === 0 ? (
          <p className="relative mt-3 text-white/80">Votre enseignante n&apos;est pas encore indiquée pour vos cours.</p>
        ) : (
          <ul className="relative mt-4 flex flex-col sm:flex-row flex-wrap gap-5">
            {enseignantes.map((e) => (
              <li key={e.id} className="flex items-center gap-4 bg-white/10 backdrop-blur rounded-2xl p-4 min-w-0 sm:min-w-[340px]">
                <div className="rounded-full ring-4 ring-white/40"><Photo nom={e.nom} initiales={e.initiales} avatar={e.avatar} taille="lg" /></div>
                <div className="min-w-0">
                  <div className="text-xs text-white/70">Votre enseignante{e.niveaux.length ? ` · ${e.niveaux.join(", ")}` : ""}</div>
                  <div className="font-playfair text-2xl font-bold leading-tight">{e.nom}</div>
                  <div className="mt-2"><PastillePresence etat={presence(e.id)} /></div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link href={`/communaute/u/${e.id}`} className="inline-flex items-center gap-1.5 rounded-xl bg-white text-[#2A0880] px-3 py-1.5 text-xs font-semibold hover:bg-white/90"><UserRound size={14} /> Son profil</Link>
                    <button type="button" onClick={() => ouvrirMessagerie({ id: e.id, nom: e.nom })} className="inline-flex items-center gap-1.5 rounded-xl border border-white/40 px-3 py-1.5 text-xs font-semibold hover:bg-white/10"><MessageCircle size={14} /> Lui écrire</button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <StylesActivite />
      <div className="mb-6"><ChoixActivite /></div>

      <div className="flex flex-col sm:flex-row gap-3 sm:items-center mb-4">
        <h2 className="font-playfair text-xl font-bold text-gray-900 dark:text-white flex-1">{groupes.length > 1 ? "Mes camarades de groupe" : groupes.length === 1 ? `Mon groupe · ${groupes[0].nom}` : "Mes camarades"} <span className="text-gray-400 text-base font-dm">({camarades.length})</span></h2>
        <label className="relative sm:w-72">
          <span className="sr-only">Rechercher une camarade</span>
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden />
          <input value={q} onChange={(e) => { setQ(e.target.value); setLimite(PAS); }} placeholder="Rechercher…" className="w-full rounded-xl border border-gray-200 pl-9 pr-9 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#5B16F9]/40" />
          {q ? <button type="button" onClick={() => setQ("")} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400" aria-label="Effacer"><X size={15} /></button> : null}
        </label>
      </div>
      {groupes.length > 1 ? (
        <ul className="flex gap-2 overflow-x-auto pb-1 mb-3 sm:flex-wrap sm:overflow-visible" aria-label="Mes groupes">
          {[{ id: null as string | null, nom: "Tous mes groupes", nb: camarades.length }, ...groupes].map((g) => {
            const actif = groupe === g.id;
            return (
              <li key={g.id ?? "tous"} className="shrink-0">
                <button type="button" aria-pressed={actif} onClick={() => { setGroupe(g.id); setLimite(PAS); }}
                  className={`flex items-center gap-2 rounded-2xl border px-3 py-2 text-left transition ${actif ? "bg-[#5B16F9] border-[#5B16F9] text-white shadow-sm" : "bg-white border-gray-200 text-gray-800 hover:border-[#5B16F9]/40"}`}>
                  <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${actif ? "bg-white/20" : "bg-[#5B16F9]/10 text-[#5B16F9]"}`} aria-hidden>{g.id ? (g.nom.trim()[0] ?? "G").toUpperCase() : "★"}</span>
                  <span className="leading-tight"><span className="block text-xs font-semibold max-w-[11rem] truncate">{g.nom}</span><span className={`block text-[11px] ${actif ? "text-white/80" : "text-gray-500"}`}>{g.nb} camarade{g.nb > 1 ? "s" : ""}</span></span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
      {niveaux.length > 1 ? (
        <div className="flex flex-wrap gap-1.5 mb-4" role="group" aria-label="Filtrer par niveau">
          <button type="button" className={puce(niveau === null)} onClick={() => setNiveau(null)} aria-pressed={niveau === null}>Tous</button>
          {niveaux.map((n) => <button key={n} type="button" className={puce(niveau === n)} onClick={() => { setNiveau(niveau === n ? null : n); setLimite(PAS); }} aria-pressed={niveau === n}>{n}</button>)}
        </div>
      ) : null}

      {liste.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-gray-200 text-center py-12 text-gray-500">
          <div className="text-4xl mb-2" aria-hidden>🪑</div>
          {camarades.length ? "Aucune camarade ne correspond." : groupes.length
            ? "Pas encore d'autres élèves dans votre groupe."
            : "Vous n'êtes pas encore dans un groupe : votre enseignante vous y ajoutera, et vos camarades de groupe apparaîtront ici."}
          <div className="mt-3"><Link href="/communaute" className="text-sm text-[#5B16F9] font-semibold hover:underline">Découvrir toute la communauté sur le feed →</Link></div>
        </div>
      ) : (
        <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
          {liste.slice(0, limite).map((c) => (
            <li key={c.id}>
              <Link href={`/communaute/u/${c.id}`} className="flex flex-col items-center text-center bg-white rounded-2xl border border-gray-100 px-3 pt-5 pb-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5B16F9]">
                <span className="relative"><Photo nom={c.nom} initiales={c.initiales} avatar={c.avatar} taille="md" /><PointEnLigne id={c.id} className="w-4 h-4 bottom-0 right-0" /></span>
                <div className="mt-3 font-semibold text-gray-900 font-dm leading-tight line-clamp-2 min-h-[2.5rem]">{c.nom}</div>
                <div className="mt-1 flex flex-wrap justify-center gap-1">
                  {c.niveaux.map((n) => <span key={n} className="px-1.5 py-0.5 rounded-md text-[11px] font-bold bg-[#5B16F9]/10 text-[#5B16F9]">{n}</span>)}
                </div>
                <ActiviteDe id={c.id} />
                {c.progression.length ? (
                  <div className="w-full mt-3 space-y-1.5">
                    {c.progression.map((p) => (
                      <div key={p.cours} title={p.pct === null ? `${p.cours} : cours sans leçon` : `${p.cours} : ${p.faites}/${p.total} leçons terminées`}>
                        <div className="flex justify-between text-[11px] text-gray-500">
                          <span className="truncate">{c.progression.length > 1 ? p.cours : "Progression"}</span>
                          <span className="font-semibold text-gray-700">{p.pct === null ? "—" : `${p.pct} %`}</span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden mt-0.5" aria-hidden>
                          <div className="h-full rounded-full bg-gradient-to-r from-orange-400 to-orange-600" style={{ width: `${p.pct ?? 0}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
                <span className="mt-3 text-[11px] text-orange-600 font-semibold">Voir son profil →</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {liste.length > limite ? (
        <div className="text-center mt-5">
          <button type="button" onClick={() => setLimite((l) => l + PAS)} className="rounded-xl border border-gray-200 bg-white px-5 py-2 text-sm font-semibold hover:bg-gray-50">Afficher plus ({liste.length - limite})</button>
        </div>
      ) : null}
      <p className="text-xs text-gray-400 mt-6">
        Vous voyez les camarades de votre groupe, leur progression (leçons terminées) dans vos cours communs et leur profil communauté.
        Les élèves des autres groupes se découvrent sur le <Link href="/communaute" className="underline">feed communauté</Link>.
        Leur suivi pédagogique (statut, relances) reste privé.
        « En ligne » (point vert) signifie qu&apos;une page Arazzo est ouverte en ce moment — sauf pour les camarades en mode discrète.
      </p>
    </div>
  );
}
