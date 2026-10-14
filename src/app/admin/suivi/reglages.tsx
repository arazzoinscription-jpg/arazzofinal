import { CLES_SEUILS, type Seuils } from "@/lib/student-care/rules";
import { dateHeure } from "@/lib/student-care/time";
import { enregistrerReglages } from "./actions";

const LIBELLES: Record<keyof Seuils, { titre: string; aide: string }> = {
  active_jours: { titre: "Activité récente", aide: "Activité réelle depuis moins de N jours → « active »." },
  inactive_jours: { titre: "Inactive", aide: "Plus de N jours sans activité réelle → « inactive » (entre les deux : « ralentie »)." },
  contact_jours: { titre: "Contact personnel", aide: "Plus de N jours sans activité réelle → contacter personnellement." },
  accueil_jours: { titre: "Accueil", aide: "Inscrite depuis N jours au plus, sans activité → accueillir." },
  felicitations_jours: { titre: "Félicitations", aide: "Module ou certificat depuis N jours au plus → féliciter." },
  refaire_jours: { titre: "Travail à refaire", aide: "Travail à refaire depuis plus de N jours → blocage." },
  video_jours: { titre: "Vidéo laissée en plan", aide: "Vidéo commencée, rien depuis plus de N jours → blocage." },
};

/** Date de début du suivi et seuils. Formulaire serveur : fonctionne sans JavaScript. */
export function ReglagesSuivi({
  startDate, seuils, majLe, ouvert,
}: { startDate: string | null; seuils: Seuils; majLe: string | null; ouvert: boolean }) {
  const champ = "w-20 border border-gray-200 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500";
  return (
    <details open={ouvert} className="bg-white rounded-2xl border border-gray-100 p-5 mb-6">
      <summary className="cursor-pointer font-semibold text-gray-900">
        ⚙️ Réglages du suivi {startDate ? <span className="font-normal text-gray-500">— date de début et seuils</span> : null}
      </summary>
      <form action={enregistrerReglages} className="mt-4 space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-sm text-gray-700">
            <span className="block mb-1 font-medium">Date de début du suivi</span>
            <input type="date" name="start_date" defaultValue={startDate ?? ""} className="border border-gray-200 rounded-xl px-3 py-2 text-sm" />
          </label>
          <p className="text-xs text-gray-500 max-w-md">
            Sont suivies les élèves qui ont au moins une inscription datée de ce jour ou après (minuit, heure d&apos;Alger).
          </p>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          {CLES_SEUILS.map((k) => (
            <label key={k} className="flex items-start gap-3 text-sm">
              <input type="number" name={k} min={1} max={365} step={1} required defaultValue={seuils[k]} className={champ} />
              <span>
                <span className="font-medium text-gray-800">{LIBELLES[k].titre} (jours)</span>
                <span className="block text-xs text-gray-500">{LIBELLES[k].aide}</span>
              </span>
            </label>
          ))}
        </div>
        <div className="rounded-xl bg-amber-50 border border-amber-100 px-3 py-2 text-xs text-amber-800">
          Ces seuils servent UNIQUEMENT à l&apos;affichage et aux actions recommandées. Aucune relance, aucun e-mail,
          aucune notification n&apos;est déclenché depuis ce tableau.
        </div>
        <div className="flex items-center gap-3">
          <button type="submit" className="bg-orange-600 text-white px-5 py-2 rounded-xl font-semibold hover:bg-orange-700">
            Enregistrer
          </button>
          {majLe ? <span className="text-xs text-gray-400">Dernière modification : {dateHeure(majLe)}</span> : null}
        </div>
      </form>
    </details>
  );
}
