"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, Ticket } from "lucide-react";
import { enregistrerReglagesGroupe, lireReglagesGroupe, type ReglagesGroupe } from "../inscription-actions";

const SLUG_NIVEAU: Record<string, string> = { N1: "niveau-1", N2: "niveau-2", N3: "niveau-3" };

/**
 * Inscriptions du groupe EN LIGNE : niveau, places, date de début, « inscription ouverte ».
 * Ouvert : la landing du niveau montre ses places (rouges = prises) et chaque inscription validée
 * au niveau rejoint le groupe automatiquement, jusqu'à ce qu'il soit complet.
 */
export function ReglagesInscription({ groupId }: { groupId: string }) {
  const router = useRouter();
  const [r, setR] = useState<ReglagesGroupe | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [courseId, setCourseId] = useState("");
  const [capacite, setCapacite] = useState("");
  const [debut, setDebut] = useState("");
  const [ouverte, setOuverte] = useState(false);

  useEffect(() => {
    lireReglagesGroupe(groupId).then((x) => {
      if (!x.ok) { setErreur(x.erreur); return; }
      setR(x.reglages);
      setCourseId(x.reglages.courseId ?? ""); setCapacite(x.reglages.capacite ? String(x.reglages.capacite) : "");
      setDebut(x.reglages.debut ?? ""); setOuverte(x.reglages.ouverte);
    }).catch(() => setErreur("Réglages illisibles pour le moment : rechargez la page."));
  }, [groupId]);

  async function enregistrer() {
    setEnvoi(true); setErreur(null); setOk(null);
    const x = await enregistrerReglagesGroupe({ groupId, courseId, capacite: capacite === "" ? null : Number(capacite), debut: debut || null, ouverte });
    setEnvoi(false);
    if (!x.ok) { setErreur(x.erreur); return; }
    setOk(ouverte ? "Inscription ouverte : la landing affiche les places de ce groupe." : "Réglages enregistrés.");
    router.refresh();
  }

  if (!r) return <div className="bg-white rounded-2xl border border-cream-200 p-5 text-sm text-gray-500">{erreur ?? "Chargement…"}</div>;
  const niveau = r.niveaux.find((n) => n.id === courseId);
  const places = Number(capacite) || 0;
  const champ = "mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-400";

  return (
    <div className="bg-white rounded-2xl border border-cream-200 shadow-soft p-5 space-y-4 max-w-2xl">
      <div className="flex items-center gap-2">
        <Ticket size={18} className="text-violet-700" aria-hidden />
        <h2 className="font-semibold text-gray-900">Inscriptions en ligne</h2>
        {r.disponible && r.ouverte ? <span className="ms-auto rounded-full bg-emerald-50 text-emerald-700 px-2.5 py-1 text-xs font-semibold">Inscription ouverte</span> : null}
      </div>
      {!r.disponible ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900"><b>Bloqué par un prérequis :</b> les groupes à places ne sont pas encore activés sur ce site (migration 101 à appliquer).</p>
      ) : null}
      <p className="text-xs text-gray-500">
        Ouvrez l&apos;inscription : la page d&apos;inscription du niveau montre les places de ce groupe (rouges = prises).
        Chaque élève dont le paiement est validé pour ce niveau rejoint le groupe automatiquement, jusqu&apos;à ce qu&apos;il soit complet.
      </p>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="text-xs text-gray-600 sm:col-span-3">Niveau du groupe
          <select value={courseId} onChange={(e) => setCourseId(e.target.value)} className={champ}>
            <option value="">— Choisir le niveau —</option>
            {r.niveaux.map((n) => <option key={n.id} value={n.id}>{n.code} — {n.titre}</option>)}
          </select>
        </label>
        <label className="text-xs text-gray-600">Nombre de places
          <input type="number" min={1} max={500} value={capacite} onChange={(e) => setCapacite(e.target.value)} className={champ} placeholder="Ex. 12" />
        </label>
        <label className="text-xs text-gray-600">Date de début
          <input type="date" value={debut} onChange={(e) => setDebut(e.target.value)} className={champ} />
        </label>
        <label className="text-xs text-gray-600 flex items-end gap-2 pb-2">
          <input type="checkbox" checked={ouverte} onChange={(e) => setOuverte(e.target.checked)} className="mb-0.5" />
          <span className="font-semibold text-gray-800">Inscription ouverte</span>
        </label>
      </div>

      {places > 0 ? (
        <div>
          <p className="text-xs text-gray-600 mb-1.5"><b>{Math.min(r.membres, places)}</b> place(s) prise(s) sur <b>{places}</b>{r.membres >= places ? " — complet" : ` · ${places - r.membres} restante(s)`}</p>
          <div className="flex flex-wrap gap-1.5" aria-hidden>
            {Array.from({ length: Math.min(places, 120) }).map((_, i) => (
              <span key={i} className={`w-5 h-5 rounded-md border ${i < r.membres ? "bg-[#e0453a] border-[#e0453a]" : "bg-orange-50 border-orange-200"}`} />
            ))}
          </div>
        </div>
      ) : null}

      {erreur ? <p className="rounded-xl bg-red-50 border border-red-100 px-3 py-2 text-sm text-red-700">{erreur}</p> : null}
      {ok ? <p className="rounded-xl bg-emerald-50 border border-emerald-100 px-3 py-2 text-sm text-emerald-800">{ok}</p> : null}
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={enregistrer} disabled={envoi || !r.disponible}
          className="rounded-xl bg-violet-700 text-white px-4 py-2 text-sm font-semibold hover:bg-violet-800 disabled:opacity-50">
          {envoi ? "Enregistrement…" : "Enregistrer"}
        </button>
        {niveau && SLUG_NIVEAU[niveau.code] ? (
          <a href={`/formation/${SLUG_NIVEAU[niveau.code]}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm text-violet-700 font-semibold hover:underline">
            Voir la page d&apos;inscription <ExternalLink size={14} aria-hidden />
          </a>
        ) : null}
      </div>
    </div>
  );
}
