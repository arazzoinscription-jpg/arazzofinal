import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { LIBELLE_TEINTE, type CarteEleve } from "@/lib/classe/vue";
import { STYLE_TEINTE } from "./teintes";

/** Photo de l'élève si elle existe, sinon ses initiales. L'anneau coloré = activité pédagogique (pas la présence). */
export function Avatar({ c, taille = "md" }: { c: Pick<CarteEleve, "nom" | "initiales" | "avatar" | "teinte">; taille?: "md" | "lg" }) {
  const dim = taille === "lg" ? "w-24 h-24 text-3xl" : "w-16 h-16 text-xl";
  return (
    <div className={`${dim} rounded-full ring-4 ring-offset-2 ${STYLE_TEINTE[c.teinte].anneau} overflow-hidden flex-shrink-0 bg-gradient-to-br from-[#5B16F9] to-[#2A0880] text-white font-playfair font-bold flex items-center justify-center`}>
      {c.avatar
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={c.avatar} alt={`Photo de ${c.nom}`} className="w-full h-full object-cover" loading="lazy" referrerPolicy="no-referrer" />
        : <span aria-label={`Initiales de ${c.nom}`}>{c.initiales}</span>}
    </div>
  );
}

export function CarteEleveVue({ c, base }: { c: CarteEleve; base: string }) {
  const s = STYLE_TEINTE[c.teinte];
  return (
    <Link
      href={`${base}/classe/${c.id}`}
      className={`group relative flex flex-col items-center text-center bg-white rounded-2xl border border-gray-100 border-t-4 ${s.carte} px-3 pt-5 pb-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5B16F9]`}
    >
      {c.alertes > 0 ? (
        <span className="absolute top-2 right-2 inline-flex items-center gap-1 rounded-full bg-red-50 text-red-700 text-[11px] font-semibold px-2 py-0.5" title="Blocages ou tâches de l'enseignante (travaux à corriger…)">
          <AlertTriangle size={12} aria-hidden /> {c.alertes}
        </span>
      ) : null}
      <Avatar c={c} />
      <div className="mt-3 font-semibold text-gray-900 font-dm leading-tight line-clamp-2 min-h-[2.5rem]">{c.nom}</div>
      <div className="mt-1 flex flex-wrap justify-center gap-1 min-h-[1.25rem]">
        {c.niveaux.length
          ? c.niveaux.map((n) => <span key={n} className="px-1.5 py-0.5 rounded-md text-[11px] font-bold bg-[#5B16F9]/10 text-[#5B16F9]">{n}</span>)
          : <span className="text-[11px] text-gray-400">Hors niveaux</span>}
      </div>

      <div className="w-full mt-3">
        {c.progression && c.progression.pct !== null ? (
          <>
            <div className="flex justify-between text-[11px] text-gray-500"><span>Progression</span><span className="font-semibold text-gray-700">{c.progression.pct} %</span></div>
            <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden mt-1" aria-hidden>
              <div className="h-full bg-gradient-to-r from-orange-400 to-orange-600" style={{ width: `${Math.min(100, Math.max(0, c.progression.pct))}%` }} />
            </div>
            <div className="text-[11px] text-gray-400 mt-0.5">{c.progression.faites}/{c.progression.total} leçons</div>
          </>
        ) : (
          <div className="text-[11px] text-gray-400 italic">Progression non disponible</div>
        )}
      </div>

      <div className="w-full mt-2 text-[12px] leading-snug min-h-[2.25rem]">
        {c.activite
          ? <><span className="text-gray-500">Dernière activité :</span> <span className="text-gray-800">{c.activite.libelle}, {c.activite.quand}</span></>
          : <span className="text-gray-400 italic">Aucune activité pédagogique enregistrée</span>}
        {c.connexion_sans_progres ? <div className="text-[11px] text-violet-700 mt-0.5">{c.connexion_sans_progres}</div> : null}
      </div>

      <span className={`mt-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${s.pastille}`}>
        <span className={`w-2 h-2 rounded-full ${s.point}`} aria-hidden />
        {LIBELLE_TEINTE[c.teinte]}
      </span>
    </Link>
  );
}
