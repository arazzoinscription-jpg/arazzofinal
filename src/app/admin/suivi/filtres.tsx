import Link from "next/link";
import type { Filtres } from "@/lib/student-care/rules";
import { LIBELLE_ACTION, LIBELLE_STATUT } from "@/lib/student-care/rules";

/** Filtres en simple formulaire GET : l'adresse garde l'état, aucun JavaScript requis. */
export function FiltresSuivi({ f, depuis }: { f: Filtres; depuis: string | null }) {
  const select = "border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white";
  return (
    <form method="get" className="flex flex-wrap gap-2 items-center mb-4">
      {depuis ? <input type="hidden" name="depuis" value={depuis} /> : null}
      <input name="q" defaultValue={f.q} placeholder="Nom, e-mail ou pseudo…" className="flex-1 min-w-48 border border-gray-200 rounded-xl px-3 py-2 text-sm" />
      <select name="niveau" defaultValue={f.niveau ?? ""} className={select} aria-label="Niveau">
        <option value="">Tous niveaux</option>
        <option value="N1">N1</option>
        <option value="N2">N2</option>
        <option value="N3">N3</option>
        <option value="aucun">Niveau non identifié</option>
      </select>
      <select name="statut" defaultValue={f.statut ?? ""} className={select} aria-label="Statut">
        <option value="">Tous statuts</option>
        {Object.entries(LIBELLE_STATUT).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
      </select>
      <select name="vue" defaultValue={f.vue ?? ""} className={select} aria-label="Situation">
        <option value="">Toutes situations</option>
        <option value="retard">En retard ou bloquées</option>
        <option value="etape">Étape terminée</option>
        <option value="a_corriger">Travaux à corriger</option>
        <option value="a_refaire">Travaux à refaire</option>
      </select>
      <select name="action" defaultValue={f.action ?? ""} className={select} aria-label="Action recommandée">
        <option value="">Toutes actions</option>
        {Object.entries(LIBELLE_ACTION).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
      </select>
      <select name="tri" defaultValue={f.tri} className={select} aria-label="Tri">
        <option value="inscription">Plus récentes</option>
        <option value="inactivite">Plus longue inactivité</option>
        <option value="nom">Nom</option>
      </select>
      <button className="bg-orange-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-orange-700">Filtrer</button>
      <Link href={depuis ? `/admin/suivi?depuis=${depuis}` : "/admin/suivi"} className="text-sm text-gray-500 hover:text-gray-800 px-2">
        Réinitialiser
      </Link>
    </form>
  );
}
