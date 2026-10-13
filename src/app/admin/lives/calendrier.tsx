import Link from "next/link";
import type { LiveComplet } from "@/lib/live-care/donnees";
import { statutLive } from "@/lib/live-care/statuts";
import { heureCourte, jourAlger, moisVoisin, nomMois, semainesDuMois } from "@/lib/live-care/temps";

const JOURS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

/** Calendrier mensuel (lundi → dimanche), jours et heures d'Alger. */
export function CalendrierLives({ mois, lives, aujourdhui, maintenant }: { mois: string; lives: LiveComplet[]; aujourdhui: string; maintenant: Date }) {
  const parJour = new Map<string, LiveComplet[]>();
  for (const l of lives) {
    const j = jourAlger(l.live.starts_at);
    parJour.set(j, [...(parJour.get(j) ?? []), l]);
  }
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4">
      <div className="flex items-center justify-between mb-3">
        <Link href={`/admin/lives?vue=calendrier&mois=${moisVoisin(mois, -1)}`} className="text-sm px-3 py-1.5 rounded-lg border border-gray-200">← Mois précédent</Link>
        <h2 className="font-playfair text-xl font-bold text-gray-900 capitalize">{nomMois(mois)}</h2>
        <Link href={`/admin/lives?vue=calendrier&mois=${moisVoisin(mois, 1)}`} className="text-sm px-3 py-1.5 rounded-lg border border-gray-200">Mois suivant →</Link>
      </div>
      <div className="grid grid-cols-7 gap-px bg-gray-100 rounded-xl overflow-hidden text-xs">
        {JOURS.map((j) => <div key={j} className="bg-gray-50 px-2 py-1.5 font-semibold text-gray-500 text-center">{j}</div>)}
        {semainesDuMois(mois).flat().map((jour) => {
          const dansLeMois = jour.startsWith(mois);
          const items = parJour.get(jour) ?? [];
          return (
            <div key={jour} className={`bg-white min-h-[92px] p-1.5 ${dansLeMois ? "" : "bg-gray-50/60 text-gray-300"} ${jour === aujourdhui ? "ring-2 ring-inset ring-orange-300" : ""}`}>
              <div className="text-[11px] font-semibold mb-1">{Number(jour.slice(8))}</div>
              <div className="space-y-1">
                {items.map((l) => {
                  const annule = statutLive(l.live, maintenant) === "annule";
                  return (
                    <Link key={l.live.id} href={`/admin/lives/${l.live.id}`} title={l.live.titre}
                      className={`block truncate rounded-md px-1.5 py-0.5 ${annule ? "bg-gray-100 text-gray-400 line-through" : "bg-orange-50 text-orange-800 hover:bg-orange-100"}`}>
                      {heureCourte(l.live.starts_at)} {l.live.titre}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
