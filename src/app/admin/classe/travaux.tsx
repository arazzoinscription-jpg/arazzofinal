import Link from "next/link";
import { LIBELLE_TRAVAIL, type TravailEleve } from "@/lib/classe/travaux";
import { dateCourte } from "@/lib/student-care/time";
import { VignetteTravail } from "./vignette";

const COULEUR: Record<string, string> = {
  submitted: "bg-orange-50 text-orange-700 border-orange-200",
  reviewed: "bg-violet-50 text-violet-700 border-violet-200",
  approved: "bg-green-50 text-green-700 border-green-200",
};

/** Tous les travaux pratiques d'UNE élève, avec un lien vers leur correction (filtrée sur elle). */
export function TravauxEleve({ userId, travaux, complet }: { userId: string; travaux: TravailEleve[]; complet: boolean }) {
  const n = (s: string) => travaux.filter((t) => t.statut === s).length;
  return (
    <section className="min-w-0 bg-white rounded-2xl border border-gray-100 p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <h2 className="font-semibold text-gray-900 font-dm">Travaux pratiques ({travaux.length})</h2>
        <Link href={`/formateur/pratiques?eleve=${userId}`} className="text-sm font-semibold text-orange-600 hover:underline">
          Corriger ses travaux →
        </Link>
      </div>
      {travaux.length ? (
        <div className="flex flex-wrap gap-2 mb-4 text-xs">
          <span className={`rounded-full border px-2.5 py-1 font-semibold ${COULEUR.submitted}`}>{n("submitted")} à corriger</span>
          <span className={`rounded-full border px-2.5 py-1 font-semibold ${COULEUR.reviewed}`}>{n("reviewed")} à retravailler</span>
          <span className={`rounded-full border px-2.5 py-1 font-semibold ${COULEUR.approved}`}>{n("approved")} validé(s)</span>
        </div>
      ) : null}
      {travaux.length === 0 ? (
        <p className="text-sm text-gray-500">Aucun travail pratique envoyé.</p>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {travaux.map((t) => {
            const image = t.annotation ?? t.photo;
            return (
              <li key={t.id} className="rounded-xl border border-gray-100 overflow-hidden flex flex-col">
                <div className="aspect-[4/3] bg-gray-50">
                  {image ? <VignetteTravail src={image} alt={`Travail : ${t.lecon}`} />
                    : t.video ? <video src={t.video} controls preload="none" className="h-full w-full bg-black object-contain" />
                    : <div className="flex h-full items-center justify-center text-xs text-gray-400">Note seule (sans photo ni vidéo)</div>}
                </div>
                <div className="p-3 text-sm space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-medium text-gray-900 leading-snug">{t.lecon}</span>
                    <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${COULEUR[t.statut] ?? "bg-gray-50 text-gray-600 border-gray-200"}`}>
                      {LIBELLE_TRAVAIL[t.statut as keyof typeof LIBELLE_TRAVAIL] ?? t.statut}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500">{t.cours ?? "Cours inconnu"} · envoyé le {dateCourte(t.cree_le)}</div>
                  {image && t.video ? <a href={t.video} target="_blank" rel="noreferrer" className="text-xs text-orange-600 hover:underline">Voir aussi la vidéo →</a> : null}
                  {t.note ? <p className="text-xs text-gray-700"><span className="text-gray-400">Note de l&apos;élève :</span> {t.note}</p> : null}
                  {t.retour ? <p className="text-xs text-violet-700"><span className="text-violet-400">Votre retour :</span> {t.retour}</p> : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {!complet ? <p className="text-xs text-gray-400 mt-3">Les 200 travaux les plus récents sont affichés.</p> : null}
    </section>
  );
}
