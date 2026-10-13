import Link from "next/link";
import type { SuiviEleve } from "@/lib/student-care/rules";
import {
  celluleActivite, celluleCertificats, celluleConnexion, celluleLeconConsultee, celluleModules,
  celluleProgression, celluleQuiz, celluleRelances, celluleTelephone, celluleTravaux, celluleVideo,
} from "@/lib/student-care/display";
import { dateCourte } from "@/lib/student-care/time";
import { Val, BadgeAction, BadgeStatut, BadgeNiveau, Barre } from "./cellule";

function lienFiche(s: SuiviEleve, depuis: string | null) {
  return `/admin/suivi/${s.user_id}${depuis ? `?depuis=${depuis}` : ""}`;
}

function Formation({ s }: { s: SuiviEleve }) {
  const autres = s.formations.filter((f) => f !== s.reference && f.genre !== "ancien_module").length;
  return (
    <div className="space-y-1">
      <div className="flex flex-wrap gap-1">
        {s.niveaux.length ? s.niveaux.map((n) => <BadgeNiveau key={n} niveau={n} />) : <span className="text-[11px] text-gray-400 italic">Niveau non identifié</span>}
      </div>
      <div className="text-sm text-gray-800">{s.reference?.titre ?? "—"}</div>
      {autres > 0 ? <div className="text-[11px] text-gray-400">+ {autres} autre(s) formation(s)</div> : null}
      {s.historique ? (
        <div className="text-[11px] text-sky-700" title="Anciens cours-modules : progression montrée à part, jamais additionnée au niveau.">
          Historique : {s.historique.cours} ancien(s) module(s), {s.historique.lecons_faites} leçon(s)
        </div>
      ) : null}
    </div>
  );
}

function Action({ s }: { s: SuiviEleve }) {
  return (
    <div className="space-y-1">
      <BadgeAction code={s.action.code} />
      {s.action.raison ? <div className="text-xs text-gray-600">{s.action.raison}</div> : null}
      {s.taches_enseignante.map((t) => (
        <div key={t.code} className="text-[11px] text-violet-700">✎ {t.libelle}</div>
      ))}
    </div>
  );
}

/** Tableau des élèves : une ligne par élève (cartes sur téléphone). */
export function TableauSuivi({ eleves, maintenantIso, depuis }: { eleves: SuiviEleve[]; maintenantIso: string; depuis: string | null }) {
  const maintenant = new Date(maintenantIso);
  if (eleves.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 text-center py-14 text-gray-500">
        Aucune élève ne correspond à ces critères.
      </div>
    );
  }
  return (
    <>
      {/* Ordinateur */}
      <div className="hidden lg:block bg-white rounded-2xl border border-gray-100 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs text-gray-500 font-dm">
            <tr>
              <th className="px-3 py-3 font-medium">Élève</th>
              <th className="px-3 py-3 font-medium">Action recommandée</th>
              <th className="px-3 py-3 font-medium">Inscription &amp; formation</th>
              <th className="px-3 py-3 font-medium">Connexion &amp; activité</th>
              <th className="px-3 py-3 font-medium">Progression</th>
              <th className="px-3 py-3 font-medium">Quiz &amp; travaux</th>
              <th className="px-3 py-3 font-medium">Relances déjà envoyées</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 align-top">
            {eleves.map((s) => (
              <tr key={s.user_id} className="hover:bg-gray-50/60">
                <td className="px-3 py-3 min-w-[170px]">
                  <Link href={lienFiche(s, depuis)} className="font-semibold text-gray-900 hover:text-orange-600">{s.nom}</Link>
                  <div className="text-xs text-gray-500 break-all">{s.email ?? "—"}</div>
                  <div className="mt-1"><Val c={celluleTelephone(s)} petit /></div>
                  <div className="mt-1"><BadgeStatut statut={s.statut} /></div>
                </td>
                <td className="px-3 py-3 min-w-[170px]"><Action s={s} /></td>
                <td className="px-3 py-3 min-w-[170px]">
                  <div className="text-xs text-gray-500 mb-1">Suivie depuis le {dateCourte(s.suivie_depuis)}{s.importee ? " · élève importée" : ""}</div>
                  <Formation s={s} />
                </td>
                <td className="px-3 py-3 min-w-[160px] space-y-1">
                  <div><Val c={celluleConnexion(s, maintenant)} petit /></div>
                  <div className="font-medium"><Val c={celluleActivite(s, maintenant)} petit /></div>
                  <div className="opacity-80"><Val c={celluleVideo(s, maintenant)} petit /></div>
                  <div className="opacity-80"><Val c={celluleLeconConsultee(s, maintenant)} petit /></div>
                </td>
                <td className="px-3 py-3 min-w-[150px]">
                  <Val c={celluleProgression(s.reference)} petit />
                  <Barre pct={s.reference?.pourcentage ?? null} />
                  <div className="mt-1"><Val c={celluleModules(s.reference)} petit /></div>
                  {s.reference?.derniere_lecon_titre ? (
                    <div className="text-[11px] text-gray-400 truncate max-w-[200px]" title={s.reference.derniere_lecon_titre}>Dernière : {s.reference.derniere_lecon_titre}</div>
                  ) : null}
                </td>
                <td className="px-3 py-3 min-w-[150px] space-y-1">
                  <div><Val c={celluleQuiz(s)} petit /></div>
                  <div><Val c={celluleTravaux(s)} petit /></div>
                  <div><Val c={celluleCertificats(s)} petit /></div>
                </td>
                <td className="px-3 py-3 min-w-[130px]"><Val c={celluleRelances(s, maintenant)} petit /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Téléphone / tablette */}
      <div className="lg:hidden space-y-3">
        {eleves.map((s) => (
          <div key={s.user_id} className="bg-white rounded-2xl border border-gray-100 p-4 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <Link href={lienFiche(s, depuis)} className="font-semibold text-gray-900">{s.nom}</Link>
                <div className="text-xs text-gray-500 break-all">{s.email ?? "—"}</div>
              </div>
              <BadgeStatut statut={s.statut} />
            </div>
            <Formation s={s} />
            <div className="grid grid-cols-2 gap-2">
              <Val c={celluleActivite(s, maintenant)} petit />
              <Val c={celluleConnexion(s, maintenant)} petit />
              <Val c={celluleProgression(s.reference)} petit />
              <Val c={celluleTravaux(s)} petit />
            </div>
            <Action s={s} />
          </div>
        ))}
      </div>
    </>
  );
}
