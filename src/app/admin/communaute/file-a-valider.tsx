"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Clock, Loader2, Play, X } from "lucide-react";
import type { AValider } from "@/lib/visiteuses/a-valider";
import { refuserPublication, refuserStory, validerPublication, validerStory } from "@/app/actions/visiteuses";
import { FondStory, RenduCalques, STYLE_CADRE, ZONE_CADRE } from "@/components/stories/rendu-calques";

const date = (iso: string) => new Date(iso).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Algiers" });

/** Aperçu : photo, vidéo (lecteur Bunny) ou story (avec ses calques). */
function Apercu({ item, bibliotheque }: { item: AValider; bibliotheque: string }) {
  const [lire, setLire] = useState(false);
  if (item.type === "story") {
    return (
      <div className="w-28 h-[200px] shrink-0 rounded-xl overflow-hidden bg-black" style={ZONE_CADRE}>
        <div className="relative" style={STYLE_CADRE}>
          <FondStory kind={item.media.kind} url={item.media.kind === "video" ? null : item.media.url} fond={item.media.fond} />
          {item.media.kind === "video" && item.media.miniature ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.media.miniature} alt="" className="absolute inset-0 w-full h-full object-cover" />
          ) : null}
          <RenduCalques calques={item.media.calques} />
        </div>
      </div>
    );
  }
  if (item.media.kind === "video" && item.media.bunnyId && bibliotheque && lire) {
    return <iframe src={`https://iframe.mediadelivery.net/embed/${bibliotheque}/${item.media.bunnyId}?autoplay=true&responsive=true`} title="Aperçu" allow="autoplay; encrypted-media" className="w-28 h-[200px] shrink-0 rounded-xl bg-black" style={{ border: 0 }} />;
  }
  return (
    <button type="button" onClick={() => setLire(true)} disabled={item.media.kind !== "video"} className="relative w-28 h-[200px] shrink-0 rounded-xl overflow-hidden bg-gray-900 disabled:cursor-default" aria-label="Voir la vidéo">
      {item.media.miniature || item.media.url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={(item.media.miniature || item.media.url) as string} alt="" className="w-full h-full object-cover" />
      ) : <span className="text-white/60 text-xs">Aperçu indisponible</span>}
      {item.media.kind === "video" ? <span className="absolute inset-0 grid place-items-center"><span className="w-10 h-10 rounded-full bg-black/55 grid place-items-center text-white"><Play size={18} /></span></span> : null}
    </button>
  );
}

/**
 * « À valider » : les publications et stories des comptes SANS formation (visiteuses) attendent ici.
 * Valider = visible de tous (une story vit alors 24 h) ; Refuser = supprimée, la personne est prévenue dans le site.
 */
export function FileAValider({ items, dispo, bibliotheque }: { items: AValider[]; dispo: boolean; bibliotheque: string }) {
  const router = useRouter();
  const [enCours, start] = useTransition();
  const [actif, setActif] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  function agir(item: AValider, valider: boolean) {
    let motif: string | null = null;
    if (!valider) {
      motif = prompt("Refuser cette publication ? Un mot pour la personne (facultatif) :", "");
      if (motif === null) return;
    }
    setActif(item.id); setErreur(null);
    start(async () => {
      const r = item.type === "story"
        ? (valider ? await validerStory(item.id) : await refuserStory(item.id, motif))
        : (valider ? await validerPublication(item.id) : await refuserPublication(item.id, motif));
      setActif(null);
      if (!r.ok) setErreur(r.erreur);
      router.refresh();
    });
  }

  return (
    <section id="a-valider" className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Clock size={18} className="text-orange-500" aria-hidden />
        <h2 className="font-semibold text-gray-900">À valider</h2>
        <span className={`ms-1 rounded-full px-2 py-0.5 text-xs font-bold ${items.length ? "bg-orange-100 text-orange-700" : "bg-gray-100 text-gray-500"}`}>{items.length}</span>
      </div>
      <p className="text-sm text-gray-500">Les comptes créés sur le site <strong>sans formation</strong> peuvent publier, mais rien n&apos;apparaît avant votre validation.</p>
      {!dispo ? <p className="rounded-xl bg-amber-50 border border-amber-100 px-3 py-2 text-sm text-amber-800">Migration 103 à appliquer : en attendant, les comptes sans formation ne peuvent pas publier.</p> : null}
      {erreur ? <p className="rounded-xl bg-red-50 border border-red-100 px-3 py-2 text-sm text-red-700">{erreur}</p> : null}
      {dispo && !items.length ? <p className="text-sm text-gray-400">Rien en attente. 🎉</p> : null}
      <ul className="space-y-3">
        {items.map((it) => (
          <li key={`${it.type}-${it.id}`} className="flex gap-3 rounded-2xl border border-gray-100 p-3">
            <Apercu item={it} bibliotheque={bibliotheque} />
            <div className="min-w-0 flex-1 flex flex-col">
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <span className="rounded-full bg-violet-50 text-violet-700 px-2 py-0.5 font-semibold">{it.nature}</span>
                {it.defi ? <span className="rounded-full bg-orange-50 text-orange-700 px-2 py-0.5 font-semibold">🏆 {it.defi}</span> : null}
                <span className="text-gray-400">{date(it.quand)}</span>
              </div>
              <div className="mt-1 font-semibold text-gray-900 truncate">{it.auteur.nom}</div>
              {it.auteur.email ? <div className="text-xs text-gray-500 truncate">{it.auteur.email}</div> : null}
              {it.legende ? <p className="mt-1 text-sm text-gray-700 line-clamp-3 whitespace-pre-wrap">{it.legende}</p> : null}
              <div className="mt-auto pt-3 flex gap-2">
                <button type="button" onClick={() => agir(it, true)} disabled={enCours}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 text-sm font-semibold disabled:opacity-50">
                  {enCours && actif === it.id ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />} Valider
                </button>
                <button type="button" onClick={() => agir(it, false)} disabled={enCours}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 hover:bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-700 disabled:opacity-50">
                  <X size={15} /> Refuser
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
