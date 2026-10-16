"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Crown, Loader2, Plus, Trophy } from "lucide-react";
import type { DefiAdmin } from "@/lib/visiteuses/a-valider";
import { creerDefi, designerGagnante, terminerDefi } from "@/app/actions/visiteuses";

const date = (iso: string) => new Date(iso).toLocaleString("fr-FR", { weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Algiers" });
function dansUneSemaine(): string {
  const d = new Date(Date.now() + 7 * 86_400_000);
  d.setHours(20, 0, 0, 0);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

/**
 * Défi couture de la semaine : l'équipe le lance (titre, consigne, récompense, date de fin), voit les photos
 * des participantes (déjà validées) et désigne la plus belle — qui reçoit sa récompense par notification.
 */
export function DefisAdmin({ defis, dispo }: { defis: DefiAdmin[]; dispo: boolean }) {
  const router = useRouter();
  const [enCours, start] = useTransition();
  const [ouvert, setOuvert] = useState(false);
  const [f, setF] = useState({ titre: "", consigne: "", recompense: "", fin: dansUneSemaine() });
  const [erreur, setErreur] = useState<string | null>(null);
  const maintenant = Date.now();

  function lancer(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    start(async () => {
      const r = await creerDefi({ ...f, fin: new Date(f.fin).toISOString() });
      if (!r.ok) { setErreur(r.erreur); return; }
      setOuvert(false); setF({ titre: "", consigne: "", recompense: "", fin: dansUneSemaine() });
      router.refresh();
    });
  }

  function agir(fn: () => Promise<{ ok: true } | { ok: false; erreur: string }>, question: string) {
    if (!confirm(question)) return;
    setErreur(null);
    start(async () => { const r = await fn(); if (!r.ok) setErreur(r.erreur); router.refresh(); });
  }

  return (
    <section className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Trophy size={18} className="text-orange-500" aria-hidden />
        <h2 className="font-semibold text-gray-900">Défi couture de la semaine</h2>
        {dispo ? (
          <button type="button" onClick={() => setOuvert((o) => !o)} className="ms-auto inline-flex items-center gap-1.5 rounded-xl bg-[#5B16F9] text-white px-3 py-1.5 text-sm font-semibold"><Plus size={15} /> Nouveau défi</button>
        ) : null}
      </div>
      <p className="text-sm text-gray-500">Un petit modèle à réaliser chez soi : chacune publie sa photo (celles des comptes sans formation passent par « À valider »), vous choisissez la plus belle.</p>
      {!dispo ? <p className="rounded-xl bg-amber-50 border border-amber-100 px-3 py-2 text-sm text-amber-800">Migration 103 à appliquer pour lancer un défi.</p> : null}
      {erreur ? <p className="rounded-xl bg-red-50 border border-red-100 px-3 py-2 text-sm text-red-700">{erreur}</p> : null}

      {ouvert ? (
        <form onSubmit={lancer} className="rounded-2xl border border-violet-100 bg-violet-50/40 p-4 space-y-3">
          <input value={f.titre} onChange={(e) => setF({ ...f, titre: e.target.value })} maxLength={120} required placeholder="Titre (ex. Coudre une trousse zippée)" className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm" aria-label="Titre du défi" />
          <textarea value={f.consigne} onChange={(e) => setF({ ...f, consigne: e.target.value })} maxLength={1500} rows={3} placeholder="La consigne : quoi coudre, avec quoi, les étapes clés…" className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm" aria-label="Consigne" />
          <input value={f.recompense} onChange={(e) => setF({ ...f, recompense: e.target.value })} maxLength={300} placeholder="Récompense (ex. code -20 % sur le Niveau 1 : DEFI20)" className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm" aria-label="Récompense" />
          <label className="block text-xs text-gray-500">Fin du défi
            <input type="datetime-local" value={f.fin} onChange={(e) => setF({ ...f, fin: e.target.value })} required className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900" />
          </label>
          <p className="text-xs text-gray-500">La récompense n&apos;est montrée qu&apos;à la gagnante, dans sa notification.</p>
          <button type="submit" disabled={enCours} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-[#5B16F9] to-[#FE7223] text-white px-4 py-2 text-sm font-semibold disabled:opacity-50">
            {enCours ? <Loader2 size={15} className="animate-spin" /> : <Trophy size={15} />} Lancer le défi
          </button>
        </form>
      ) : null}

      {defis.length ? (
        <ul className="space-y-4">
          {defis.map((d) => {
            const enCoursDefi = new Date(d.fin).getTime() > maintenant;
            return (
              <li key={d.id} className="rounded-2xl border border-gray-100 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold text-gray-900">{d.titre}</h3>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${enCoursDefi ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>{enCoursDefi ? `En cours · fin ${date(d.fin)}` : `Terminé le ${date(d.fin)}`}</span>
                  {enCoursDefi ? <button type="button" onClick={() => agir(() => terminerDefi(d.id), "Terminer ce défi maintenant ?")} disabled={enCours} className="ms-auto text-xs font-semibold text-gray-500 hover:text-gray-800">Terminer maintenant</button> : null}
                </div>
                {d.consigne ? <p className="mt-1 text-sm text-gray-600 whitespace-pre-wrap">{d.consigne}</p> : null}
                {d.recompense ? <p className="mt-1 text-xs text-gray-500">Récompense : {d.recompense}</p> : null}
                <p className="mt-3 text-xs font-semibold text-gray-500">{d.participations.length} participation{d.participations.length > 1 ? "s" : ""} en ligne</p>
                {d.participations.length ? (
                  <ul className="mt-2 grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {d.participations.map((p) => {
                      const gagnante = d.gagnant === p.mediaId;
                      return (
                        <li key={p.mediaId} className={`relative rounded-xl overflow-hidden border ${gagnante ? "border-orange-400 ring-2 ring-orange-300" : "border-gray-100"}`}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          {p.photo ? <img src={p.photo} alt={`Réalisation de ${p.auteur}`} className="w-full aspect-square object-cover" /> : <div className="aspect-square bg-gray-100" />}
                          <div className="px-2 py-1.5 text-[11px] text-gray-700 truncate">{p.auteur}</div>
                          {gagnante ? <span className="absolute top-1 start-1 rounded-full bg-orange-500 text-white text-[10px] font-bold px-2 py-0.5 inline-flex items-center gap-1"><Crown size={11} /> Gagnante</span> : null}
                          {!d.gagnant ? (
                            <button type="button" onClick={() => agir(() => designerGagnante(d.id, p.mediaId), `Désigner ${p.auteur} gagnante du défi ? Elle recevra la récompense par notification.`)} disabled={enCours}
                              className="absolute top-1 end-1 rounded-full bg-white/90 text-orange-600 text-[10px] font-bold px-2 py-0.5 shadow">Gagnante ?</button>
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : dispo ? <p className="text-sm text-gray-400">Aucun défi pour l&apos;instant.</p> : null}
    </section>
  );
}
