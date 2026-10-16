"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Bell, BellRing, Play, X } from "lucide-react";
import type { CibleCommande, EtapeEnvoi } from "@/lib/classe/commande";
import { MESSAGES_CLOCHE, heureAlger } from "@/lib/cloches/regles";
import { jouerCloche } from "@/components/cloche/son-cloche";
import { annulerClocheAction, apercuClocheAction, creerClocheAction, listerClochesAction, type ClocheVue } from "./cloche-actions";
import { Etapes } from "./etapes";

const champ = "mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#5B16F9]/30";
const LIBELLE_ETAT: Record<ClocheVue["etat"], { texte: string; classe: string }> = {
  programmee: { texte: "Programmée", classe: "bg-violet-50 text-violet-700" },
  envoyee: { texte: "Sonnée", classe: "bg-emerald-50 text-emerald-700" },
  annulee: { texte: "Annulée", classe: "bg-gray-100 text-gray-500" },
  manquee: { texte: "Non partie", classe: "bg-amber-50 text-amber-800" },
};

/** « AAAA-MM-JJTHH:MM » à Alger, pour le champ date-heure. */
function maintenantAlger(decalageMin = 0): string {
  return new Date(Date.now() + 60 * 60_000 + decalageMin * 60_000).toISOString().slice(0, 16);
}

/** Cloche de classe : faire sonner tout de suite, ou programmer, pour une classe (groupe) ou un niveau. */
export function PanneauCloche({ base, niveau, groupes, groupeCourant }: {
  base: string;
  niveau: { id: string; code: string } | null;
  groupes: { id: string; nom: string; membres: number }[];
  groupeCourant: string | null;
}) {
  const [type, setType] = useState<"groupe" | "niveau">(groupeCourant || (!niveau && groupes.length) ? "groupe" : "niveau");
  const [groupeId, setGroupeId] = useState(groupeCourant ?? "");
  const [message, setMessage] = useState<string>(MESSAGES_CLOCHE[0]);
  const [quand, setQuand] = useState<"maintenant" | "programmer">("maintenant");
  const [date, setDate] = useState(maintenantAlger(30));
  const [eleves, setEleves] = useState<number | null>(null);
  const [disponible, setDisponible] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [confirme, setConfirme] = useState(false);
  const [etape, setEtape] = useState<EtapeEnvoi | null>(null);
  const [detail, setDetail] = useState<string | null>(null);
  const [cloches, setCloches] = useState<ClocheVue[] | null>(null);
  const enCours = useRef(false);

  const cible: CibleCommande | null = type === "groupe" ? (groupeId ? { type: "groupe", id: groupeId } : null) : (niveau ? { type: "niveau", courseId: niveau.id } : null);
  const cleCible = cible ? JSON.stringify(cible) : "";

  const recharger = useCallback(async () => {
    const r = await listerClochesAction({ base });
    if (r.ok) setCloches(r.cloches); else setCloches(null);
  }, [base]);

  useEffect(() => { void recharger(); }, [recharger]);

  // Nombre d'élèves de la classe visée (montré AVANT toute cloche).
  useEffect(() => {
    setConfirme(false); setEleves(null); setErreur(null);
    if (!cible) return;
    let annule = false;
    void apercuClocheAction({ base, cible }).then((r) => {
      if (annule) return;
      if (r.ok) { setEleves(r.eleves); setDisponible(r.disponible); } else setErreur(r.erreur);
    });
    return () => { annule = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cleCible, base]);

  async function sonner() {
    if (enCours.current || !cible) return;
    enCours.current = true;
    setEtape("declenche"); setDetail(null);
    const r = await creerClocheAction({ base, cible, message, quand: quand === "maintenant" ? "maintenant" : date, confirmation: confirme });
    enCours.current = false;
    setConfirme(false);
    if (!r.ok) { setEtape("bloque"); setDetail(r.erreur); return; }
    // Programmée : rien n'est encore parti (« préparé ») ; immédiate : notifications enregistrées.
    setEtape(r.immediat ? "confirme" : "prepare");
    setDetail(r.immediat ? `la cloche a sonné : ${r.destinataires} notification(s) enregistrée(s) pour les élèves.` : `cloche programmée pour ${heureAlger(r.sonneLe)} (heure d'Alger) ; elle partira à l'heure prévue.`);
    void recharger();
  }

  async function annuler(id: string) {
    const r = await annulerClocheAction({ base, id });
    if (!r.ok) setErreur(r.erreur);
    void recharger();
  }

  const puce = (actif: boolean) => `rounded-full border px-3 py-1.5 text-xs font-semibold ${actif ? "bg-[#5B16F9] border-[#5B16F9] text-white" : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"}`;

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <div className="space-y-3">
        {!disponible ? (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900"><b>Bloqué par un prérequis :</b> la cloche de classe n&apos;est pas encore activée sur ce site (migration 098 à appliquer).</p>
        ) : null}
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Classe visée">
          <span className="text-xs text-gray-500 me-1">Pour :</span>
          {groupes.length ? <button type="button" className={puce(type === "groupe")} aria-pressed={type === "groupe"} onClick={() => setType("groupe")}>Une classe (groupe)</button> : null}
          <button type="button" className={puce(type === "niveau")} aria-pressed={type === "niveau"} onClick={() => setType("niveau")}>{niveau ? `Le niveau ${niveau.code}` : "Un niveau"}</button>
        </div>
        {type === "groupe" ? (
          <select value={groupeId} onChange={(e) => setGroupeId(e.target.value)} className={champ} aria-label="Classe">
            <option value="">— Choisir la classe —</option>
            {groupes.map((g) => <option key={g.id} value={g.id}>{g.nom} ({g.membres})</option>)}
          </select>
        ) : !niveau ? <p className="text-xs text-gray-600">Choisissez le niveau en haut de l&apos;Espace de commande.</p> : null}

        <div>
          <div className="flex flex-wrap gap-1.5 mb-1">
            {MESSAGES_CLOCHE.map((m) => <button key={m} type="button" onClick={() => setMessage(m)} className={puce(message === m)}>{m}</button>)}
          </div>
          <label className="block text-xs text-gray-500">Message de la cloche
            <input value={message} onChange={(e) => setMessage(e.target.value)} maxLength={200} className={champ} />
          </label>
        </div>

        <div className="flex flex-wrap items-end gap-2">
          <button type="button" className={puce(quand === "maintenant")} aria-pressed={quand === "maintenant"} onClick={() => setQuand("maintenant")}>Maintenant</button>
          <button type="button" className={puce(quand === "programmer")} aria-pressed={quand === "programmer"} onClick={() => setQuand("programmer")}>À une date et une heure</button>
          {quand === "programmer" ? (
            <label className="text-[11px] text-gray-600">Heure d&apos;Alger
              <input type="datetime-local" value={date} min={maintenantAlger(1)} onChange={(e) => setDate(e.target.value)} className="block mt-0.5 border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-white" />
            </label>
          ) : null}
          <button type="button" onClick={() => { void jouerCloche(3); }} className="ms-auto inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50">
            <Play size={13} aria-hidden /> Écouter la cloche
          </button>
        </div>

        {erreur ? <p className="rounded-xl bg-red-50 border border-red-100 px-3 py-2 text-sm text-red-700">{erreur}</p> : null}
        {cible && eleves !== null ? (
          <div className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 space-y-2">
            <label className="flex items-start gap-2">
              <input type="checkbox" checked={confirme} disabled={!eleves || !disponible} onChange={(e) => setConfirme(e.target.checked)} className="mt-1" />
              <span>Je confirme : la cloche sonnera chez <b>{eleves}</b> élève(s){quand === "programmer" ? ` le ${heureAlger(new Date(`${date}:00+01:00`).toISOString())}` : " maintenant"}.</span>
            </label>
            <button type="button" onClick={sonner} disabled={!confirme || etape === "declenche"}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-[#5B16F9] to-[#FE7223] px-4 py-2 text-sm font-semibold text-white disabled:opacity-40 disabled:cursor-not-allowed">
              <BellRing size={16} aria-hidden /> {quand === "maintenant" ? "Faire sonner la cloche" : "Programmer la cloche"}
            </button>
          </div>
        ) : null}
        <Etapes etape={etape} detail={detail} />
        <p className="text-[11px] text-gray-500">
          Les élèves reçoivent une notification avec une vibration de cloche sur leur téléphone (s&apos;ils ont activé les notifications),
          et une cloche sonne si le site est ouvert. Un site ne peut pas imposer une sonnerie personnalisée quand l&apos;application est fermée.
        </p>
      </div>

      <div>
        <h3 className="text-xs font-semibold text-gray-500 mb-2 inline-flex items-center gap-1.5"><Bell size={13} aria-hidden /> Mes cloches</h3>
        {cloches === null ? <p className="text-xs text-gray-400">—</p> : cloches.length === 0 ? <p className="text-xs text-gray-400">Aucune cloche pour l&apos;instant.</p> : (
          <ul className="space-y-1.5 max-h-72 overflow-y-auto">
            {cloches.map((c) => (
              <li key={c.id} className="rounded-xl border border-gray-100 bg-white px-3 py-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 font-semibold ${LIBELLE_ETAT[c.etat].classe}`}>{LIBELLE_ETAT[c.etat].texte}</span>
                  <span className="text-gray-500 truncate">{c.cible}</span>
                  {c.etat === "programmee" ? (
                    <button type="button" onClick={() => annuler(c.id)} className="ms-auto inline-flex items-center gap-1 text-gray-500 hover:text-red-600" aria-label="Annuler cette cloche"><X size={13} /> Annuler</button>
                  ) : null}
                </div>
                <div className="mt-1 text-gray-800 font-medium truncate">{c.message}</div>
                <div className="text-gray-400">{heureAlger(c.sonneLe)}{c.destinataires !== null ? ` · ${c.destinataires} élève(s)` : ""}</div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
