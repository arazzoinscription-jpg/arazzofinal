import { CANAUX, RAPPELS_PROPOSES, type Canal, type RegleRappel } from "@/lib/live-care/rappels";
import type { CoursNiveau } from "@/lib/live-care/donnees";
import { BoutonEnvoi } from "./bouton-envoi";

export interface ValeursLive {
  id?: string;
  titre: string;
  description: string;
  jour: string;
  heure: string;
  duree_minutes: number;
  lien: string;
  course_ids: string[];
  recurrence: "unique" | "hebdo";
  jour_fin: string;
  rappels: RegleRappel[];
}

const champ = "w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500";

/**
 * Formulaire de live (création ou modification). Formulaire serveur : fonctionne
 * sans JavaScript. Les heures sont TOUJOURS celles d'Alger.
 */
export function FormulaireLive({
  base, action, valeurs, niveaux, mode, serie,
}: {
  /** Espace d'où vient le formulaire (/admin ou /formateur) : l'action le revérifie côté serveur. */
  base: string;
  action: (f: FormData) => Promise<void>;
  valeurs: ValeursLive;
  niveaux: CoursNiveau[];
  mode: "creer" | "modifier";
  /** En modification d'une occurrence de série : propose « cette occurrence » ou « toute la série ». */
  serie?: { date_debut: string; date_fin: string } | null;
}) {
  const cles = new Set(RAPPELS_PROPOSES.filter((p) => valeurs.rappels.some((r) => r.moment === p.moment && r.decalage_minutes === p.decalage_minutes)).map((p) => p.cle));
  const canaux = new Set(valeurs.rappels.map((r) => r.canal));
  const canauxCoches: Set<Canal> = canaux.size ? canaux : new Set<Canal>(mode === "creer" ? ["notification"] : []);
  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="base" value={base} />
      {valeurs.id ? <input type="hidden" name="id" value={valeurs.id} /> : null}

      {mode === "modifier" && serie ? (
        <fieldset className="bg-amber-50 border border-amber-100 rounded-2xl p-4 text-sm">
          <legend className="font-semibold text-gray-900 px-1">Portée de la modification</legend>
          <label className="flex items-center gap-2 mt-1"><input type="radio" name="portee" value="occurrence" defaultChecked /> Cette occurrence seulement</label>
          <label className="flex items-center gap-2 mt-1"><input type="radio" name="portee" value="serie" /> Toute la série à venir (le jour de la semaine reste celui du {serie.date_debut})</label>
          <p className="text-xs text-amber-800 mt-2">Les occurrences passées, annulées ou modifiées à la main ne sont jamais écrasées.</p>
        </fieldset>
      ) : null}

      <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
        <label className="block text-sm">
          <span className="font-medium text-gray-800">Titre *</span>
          <input name="titre" required minLength={2} maxLength={140} defaultValue={valeurs.titre} className={`${champ} mt-1`} placeholder="Live de correction — Niveau 1" />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-gray-800">Description</span>
          <textarea name="description" maxLength={2000} rows={3} defaultValue={valeurs.description} className={`${champ} mt-1`} />
        </label>
        <div className="grid sm:grid-cols-3 gap-3">
          <label className="block text-sm">
            <span className="font-medium text-gray-800">Date *</span>
            <input type="date" name="jour" required defaultValue={valeurs.jour} className={`${champ} mt-1`} />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-gray-800">Heure d&apos;Alger *</span>
            <input type="time" name="heure" required defaultValue={valeurs.heure} className={`${champ} mt-1`} />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-gray-800">Durée (minutes)</span>
            <input type="number" name="duree_minutes" min={5} max={600} step={5} defaultValue={valeurs.duree_minutes} className={`${champ} mt-1`} />
          </label>
        </div>
        <label className="block text-sm">
          <span className="font-medium text-gray-800">Lien du live (https://…)</span>
          <input type="url" name="lien" defaultValue={valeurs.lien} className={`${champ} mt-1`} placeholder="https://meet.google.com/… ou YouTube" />
        </label>
        <fieldset className="text-sm">
          <legend className="font-medium text-gray-800 mb-1">Niveau(x) concerné(s) *</legend>
          <div className="flex flex-wrap gap-3">
            {niveaux.map((n) => (
              <label key={n.id} className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-2">
                <input type="checkbox" name="course_ids" value={n.id} defaultChecked={valeurs.course_ids.includes(n.id)} />
                <span className="font-semibold text-[#5B16F9]">{n.code}</span> <span className="text-gray-600">{n.titre}</span>
              </label>
            ))}
            {niveaux.length === 0 ? <span className="text-amber-700">Aucun cours de niveau trouvé (src/lib/niveaux.ts).</span> : null}
          </div>
        </fieldset>
      </div>

      {mode === "creer" || serie ? (
        <fieldset className="bg-white rounded-2xl border border-gray-100 p-5 text-sm space-y-2">
          <legend className="font-semibold text-gray-900 px-1">Programmation</legend>
          {mode === "creer" ? (
            <>
              <label className="flex items-center gap-2"><input type="radio" name="recurrence" value="unique" defaultChecked={valeurs.recurrence === "unique"} /> Une seule fois</label>
              <label className="flex items-center gap-2"><input type="radio" name="recurrence" value="hebdo" defaultChecked={valeurs.recurrence === "hebdo"} /> Chaque semaine, même jour et même heure</label>
            </>
          ) : <input type="hidden" name="recurrence" value="hebdo" />}
          <label className="block">
            <span className="text-gray-700">Jusqu&apos;au (récurrence hebdomadaire, 26 semaines au plus)</span>
            <input type="date" name="jour_fin" defaultValue={valeurs.jour_fin} className={`${champ} mt-1 max-w-xs`} />
          </label>
        </fieldset>
      ) : <input type="hidden" name="recurrence" value="unique" />}

      <fieldset className="bg-white rounded-2xl border border-gray-100 p-5 text-sm space-y-3">
        <legend className="font-semibold text-gray-900 px-1">Rappels (planifiés seulement)</legend>
        <div className="flex flex-wrap gap-3">
          {RAPPELS_PROPOSES.map((p) => (
            <label key={p.cle} className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-2">
              <input type="checkbox" name="rappels" value={p.cle} defaultChecked={mode === "creer" ? p.cle === "veille" || p.cle === "heure" : cles.has(p.cle)} /> {p.libelle}
            </label>
          ))}
        </div>
        <div className="space-y-1">
          {(Object.keys(CANAUX) as Canal[]).map((c) => (
            <label key={c} className={`flex items-start gap-2 ${CANAUX[c].disponible ? "" : "opacity-60"}`}>
              <input type="checkbox" name="canaux" value={c} disabled={!CANAUX[c].disponible} defaultChecked={CANAUX[c].disponible && canauxCoches.has(c)} className="mt-1" />
              <span>
                <span className="font-medium text-gray-800">{CANAUX[c].libelle}{CANAUX[c].disponible ? "" : " — indisponible"}</span>
                <span className="block text-xs text-gray-500">{CANAUX[c].limite}</span>
              </span>
            </label>
          ))}
        </div>
        <p className="rounded-xl bg-amber-50 border border-amber-100 px-3 py-2 text-xs text-amber-800">
          Dans cette version, les rappels sont seulement PLANIFIÉS : aucun e-mail, aucune notification, aucun WhatsApp n&apos;est envoyé.
          Le cron existant (J-1 / H-1) est verrouillé pour les lives programmés ici, afin d&apos;éviter tout doublon.
        </p>
      </fieldset>

      <BoutonEnvoi libelle={mode === "creer" ? "Programmer" : "Enregistrer les modifications"} className="bg-orange-600 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-orange-700" />
    </form>
  );
}
