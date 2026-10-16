"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { PartyPopper, X } from "lucide-react";
import { alertesActives, texteAlerte, type ResultatVue } from "@/lib/resultats";

const CLE_FERMES = "arazzo:resultats-fermes";

function lireFermes(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(CLE_FERMES) ?? "[]") as string[]); } catch { return new Set(); }
}

/** Le résultat en grand : photo, vidéo du site ou vidéo Bunny, avec la légende et le lien vers son profil. */
function VoirResultat({ r, bibliotheque, onFermer }: { r: ResultatVue; bibliotheque: string; onFermer: () => void }) {
  const idBunny = r.videoHls ? r.videoHls.split("/").filter(Boolean).slice(-2, -1)[0] ?? "" : "";
  return (
    <div role="dialog" aria-modal="true" aria-label={`Résultat de ${r.auteur}`} className="fixed inset-0 z-[90] bg-black flex flex-col" onClick={onFermer}>
      <div className="flex items-center gap-2 px-3 pt-[max(10px,env(safe-area-inset-top))] pb-2 text-white" onClick={(e) => e.stopPropagation()}>
        <PartyPopper size={20} className="text-orange-300" aria-hidden />
        <span className="font-semibold text-sm truncate">{r.auteur} a terminé son modèle</span>
        <button type="button" onClick={onFermer} aria-label="Fermer" className="ms-auto p-2 rounded-full hover:bg-white/10"><X size={22} /></button>
      </div>
      <div className="relative flex-1 min-h-0 flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
        {r.kind === "image" && r.mediaUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={r.mediaUrl} alt={r.legende ?? `Résultat de ${r.auteur}`} className="max-w-full max-h-full object-contain" />
        ) : r.mediaUrl ? (
          <video src={r.mediaUrl} poster={r.thumbnail ?? undefined} autoPlay controls playsInline className="max-w-full max-h-full object-contain" />
        ) : idBunny && bibliotheque ? (
          <iframe src={`https://iframe.mediadelivery.net/embed/${bibliotheque}/${idBunny}?autoplay=true&responsive=true`} title="Résultat" allow="autoplay; encrypted-media" className="w-full h-full" style={{ border: 0 }} />
        ) : <p className="text-white/70 text-sm">Résultat indisponible.</p>}
      </div>
      <div className="px-4 pt-2 pb-[max(16px,env(safe-area-inset-bottom))] text-white text-center" onClick={(e) => e.stopPropagation()}>
        {r.legende ? <p className="text-sm text-white/90 mb-2">{r.legende}</p> : null}
        <Link href={`/communaute/u/${r.auteurId}`} className="inline-block rounded-full bg-white text-[#2A0880] px-4 py-2 text-xs font-semibold">Voir son profil</Link>
      </div>
    </div>
  );
}

/**
 * Alerte du feed : « 🎉 Bravo ! … a terminé son modèle — Voir le résultat », pendant 24 h après la publication.
 * Chaque personne peut la fermer (retenu sur son appareil).
 */
export function AlerteResultats({ resultats, bibliotheque }: { resultats: ResultatVue[]; bibliotheque: string }) {
  const [fermes, setFermes] = useState<Set<string>>(new Set());
  const [pret, setPret] = useState(false);
  const [ouvert, setOuvert] = useState<ResultatVue | null>(null);
  useEffect(() => { setFermes(lireFermes()); setPret(true); }, []);
  const actives = useMemo(() => alertesActives(resultats, new Date(), fermes), [resultats, fermes]);
  const r = actives[0];

  function fermer() {
    const f = new Set(fermes);
    actives.forEach((x) => f.add(x.id));
    setFermes(f);
    try { localStorage.setItem(CLE_FERMES, JSON.stringify([...f].slice(-200))); } catch { /* stockage indisponible */ }
  }

  if (!pret || !r) return ouvert ? <VoirResultat r={ouvert} bibliotheque={bibliotheque} onFermer={() => setOuvert(null)} /> : null;
  return (
    <>
      <div role="status" className="fixed z-40 inset-x-3 sm:inset-x-auto sm:start-1/2 sm:-translate-x-1/2 sm:w-[440px] top-[calc(env(safe-area-inset-top)+112px)] rounded-2xl bg-gradient-to-r from-[#FE7223] to-[#5B16F9] text-white shadow-2xl px-3 py-2.5 flex items-center gap-3">
        <button type="button" onClick={() => setOuvert(r)} className="flex items-center gap-3 min-w-0 flex-1 text-left" aria-label="Voir le résultat">
          <span className="w-11 h-11 rounded-xl overflow-hidden bg-white/20 flex-shrink-0 flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {r.thumbnail ? <img src={r.thumbnail} alt="" className="w-full h-full object-cover" /> : <PartyPopper size={20} aria-hidden />}
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-semibold leading-tight truncate">{texteAlerte(r, actives.length - 1)}</span>
            <span className="block text-xs text-white/85 underline underline-offset-2">Voir le résultat</span>
          </span>
        </button>
        <button type="button" onClick={fermer} aria-label="Fermer l'alerte" className="p-1 rounded-full hover:bg-white/15 flex-shrink-0"><X size={16} /></button>
      </div>
      {ouvert ? <VoirResultat r={ouvert} bibliotheque={bibliotheque} onFermer={() => setOuvert(null)} /> : null}
    </>
  );
}
