import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { adminConnecte } from "@/lib/student-care/guard";
import { lireReglages } from "@/lib/student-care/load";
import { SEUILS_PAR_DEFAUT } from "@/lib/student-care/rules";
import { elevesConcernees, etatMigration, lireLive } from "@/lib/live-care/load";
import { CANAUX, RAPPELS_PROPOSES, etatRappel, fenetreCronExistant } from "@/lib/live-care/rappels";
import {
  CELLULE_PRESENCE_CONFIRMEE, CELLULE_PRESENCE_REELLE, celluleInvitationEnvoyee, celluleInvitationPrevue, statutLive,
} from "@/lib/live-care/statuts";
import { NOMS_JOURS, dateLongue, heureCourte, jourSemaine } from "@/lib/live-care/temps";
import { Val, BadgeAction, BadgeStatut } from "../../suivi/cellule";
import { BadgeStatutLive, Niveaux } from "../elements";
import { annulerLiveAction } from "../actions";
import { BoutonEnvoi } from "../bouton-envoi";

export const metadata = { title: "Live — Admin" };
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const libelleRappel = (moment: string, decalage: number) =>
  RAPPELS_PROPOSES.find((p) => p.moment === moment && p.decalage_minutes === decalage)?.libelle
  ?? (moment === "avant" ? `${decalage} min avant` : moment === "debut" ? "Au démarrage" : `${decalage} min après la fin`);

export default async function LivePage({ params, searchParams }: { params: { id: string }; searchParams: Record<string, string | string[] | undefined> }) {
  if (!(await adminConnecte())) redirect("/dashboard");
  if (!UUID.test(params.id)) notFound();
  const admin = createAdminClient();
  if (await etatMigration(admin)) redirect("/admin/lives");
  const l = await lireLive(admin, params.id);
  if (!l) notFound();

  const maintenant = new Date();
  const reglages = await lireReglages(admin);
  const seuils = reglages.ok ? reglages.reglages.seuils : SEUILS_PAR_DEFAUT;
  // Direct privé (groupe / lien secret) : pas d'élèves « par niveau » — ne pas lister tout le monde.
  const prive = Boolean(l.live.audience && l.live.audience !== "public");
  const { eleves, complet, global } = prive
    ? { eleves: [] as Awaited<ReturnType<typeof elevesConcernees>>["eleves"], complet: true, global: false }
    : await elevesConcernees(admin, l, { seuils, maintenant });
  const st = statutLive(l.live, maintenant);
  const cron = fenetreCronExistant(l.live.starts_at);
  const un = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
  const ok = un(searchParams.ok);
  const erreur = un(searchParams.erreur);
  const modifiable = st === "a_venir";

  return (
    <div className="px-4 lg:px-8 py-6 max-w-6xl">
      <Link href="/admin/lives" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-3"><ArrowLeft size={15} /> Retour aux lives</Link>
      {ok ? <div className="mb-4 rounded-xl bg-green-50 border border-green-100 px-4 py-2 text-sm text-green-800">{ok}</div> : null}
      {erreur ? <div className="mb-4 rounded-xl bg-red-50 border border-red-100 px-4 py-2 text-sm text-red-700">{erreur}</div> : null}

      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <h1 className={`font-playfair text-3xl font-bold text-gray-900 ${st === "annule" ? "line-through text-gray-400" : ""}`}>{l.live.titre}</h1>
          <p className="text-gray-600"><span className="capitalize">{dateLongue(l.live.starts_at)}</span> · {heureCourte(l.live.starts_at)} (heure d&apos;Alger) · {l.live.duree_minutes ?? "durée non renseignée"} {l.live.duree_minutes ? "min" : ""}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2"><Niveaux cours={l.cours} audience={l.live.audience} /><BadgeStatutLive statut={st} /></div>
        </div>
        {modifiable ? <Link href={`/admin/lives/${l.live.id}/modifier`} className="bg-white border border-gray-200 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-gray-50">✎ Modifier</Link> : null}
      </div>

      <div className="grid gap-4 md:grid-cols-2 mb-4">
        <section className="bg-white rounded-2xl border border-gray-100 p-5 text-sm space-y-1.5">
          <h2 className="font-semibold text-gray-900 mb-2">Informations</h2>
          <div><span className="text-gray-500">Lien : </span>{l.live.meet_url ? <a className="text-orange-600 break-all hover:underline" href={l.live.meet_url} target="_blank" rel="noreferrer">{l.live.meet_url}</a> : <span className="text-amber-700 italic">Aucun lien renseigné</span>}</div>
          {l.live.description ? <p className="text-gray-700 whitespace-pre-line">{l.live.description}</p> : null}
          {l.serie ? (
            <div className="text-gray-700">↻ Série : chaque {NOMS_JOURS[jourSemaine(l.serie.date_debut)]} à {l.serie.heure_alger}, du {l.serie.date_debut} au {l.serie.date_fin}{l.serie.cancelled_at ? " — série annulée" : ""}{l.live.occurrence_modifiee ? " · cette occurrence a été modifiée à la main" : ""}</div>
          ) : <div className="text-gray-500">Live unique</div>}
          {l.live.created_via !== "admin_lives" ? <div className="text-gray-500">Créé depuis la page formatrice (/formateur/sessions).</div> : null}
          {l.live.cancelled_at ? <div className="text-gray-600">Annulé le {dateLongue(l.live.cancelled_at)} à {heureCourte(l.live.cancelled_at)} — {l.live.cancel_reason}</div> : null}
        </section>

        <section className="bg-white rounded-2xl border border-gray-100 p-5 text-sm">
          <h2 className="font-semibold text-gray-900 mb-2">Rappels planifiés</h2>
          {l.rappels.length === 0 ? <p className="text-gray-500">Aucun rappel planifié.</p> : (
            <ul className="space-y-1">
              {l.rappels.map((r) => {
                const e = etatRappel(r, maintenant);
                return (
                  <li key={r.id} className="flex flex-wrap justify-between gap-2 border-b border-gray-50 last:border-0 py-1">
                    <span>{libelleRappel(r.moment, r.decalage_minutes)} · {CANAUX[r.canal].libelle}</span>
                    <span className="text-gray-500">{dateLongue(r.prevu_le)} {heureCourte(r.prevu_le)}</span>
                    <span className={e.code === "envoye" ? "text-green-700" : e.code === "prevu" ? "text-sky-700" : "text-gray-500"}>{e.libelle}</span>
                  </li>
                );
              })}
            </ul>
          )}
          <p className="text-xs text-gray-500 mt-3">
            Aucun moteur d&apos;envoi n&apos;est actif : « Envoyé » n&apos;apparaîtra qu&apos;avec une confirmation (date + identifiant du fournisseur).
            {cron.veille || cron.heure
              ? l.live.created_via === "admin_lives"
                ? " Ce live tombe dans la fenêtre du cron existant (08:00 UTC) : ses rappels J-1/H-1 sont bloqués par le verrou anti-doublon."
                : " Live créé hors de ce module : le cron existant (08:00 UTC) peut envoyer ses rappels J-1/H-1 — la colonne « Invitation envoyée » n'affiche que les traces réellement enregistrées."
              : ""}
          </p>
        </section>
      </div>

      <section className="bg-white rounded-2xl border border-gray-100 p-5 mb-4 overflow-x-auto">
        <h2 className="font-semibold text-gray-900 mb-1">Élèves concernées ({eleves.length})</h2>
        <p className="text-xs text-gray-500 mb-3">
          {prive
            ? "Direct privé (groupe ou lien secret) : il est réservé aux membres du groupe ou aux personnes qui ont le lien ; ce module ne les liste pas."
            : global ? "Live global : toutes les élèves inscrites à au moins une formation." : "Élèves inscrites à au moins un des niveaux du live."}
          {complet ? "" : " ⚠️ Lecture incomplète."}
        </p>
        {prive ? null : eleves.length === 0 ? <p className="text-sm text-gray-500">Aucune élève inscrite à ces niveaux.</p> : (
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-gray-500">
              <tr>
                <th className="py-2 pe-3">Élève</th><th className="py-2 pe-3">Suivi</th><th className="py-2 pe-3">Invitation prévue</th>
                <th className="py-2 pe-3">Invitation envoyée</th><th className="py-2 pe-3">Présence confirmée</th><th className="py-2">Présence réelle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 align-top">
              {eleves.map((e) => (
                <tr key={e.suivi.user_id}>
                  <td className="py-2 pe-3 min-w-[170px]">
                    <Link href={`/admin/suivi/${e.suivi.user_id}`} className="font-medium text-gray-900 hover:text-orange-600">{e.suivi.nom}</Link>
                    <div className="text-xs text-gray-500 break-all">{e.suivi.email ?? "—"}</div>
                    <div className="text-[11px] text-gray-400">{e.niveaux.filter((n) => n !== "autre").join(", ") || "—"}</div>
                  </td>
                  <td className="py-2 pe-3 min-w-[150px] space-y-1"><BadgeStatut statut={e.suivi.statut} /><div><BadgeAction code={e.suivi.action.code} /></div></td>
                  <td className="py-2 pe-3 min-w-[150px]"><Val c={celluleInvitationPrevue(l.rappels, e.email_autorise, maintenant)} petit /></td>
                  <td className="py-2 pe-3 min-w-[150px]"><Val c={celluleInvitationEnvoyee(l.rappels, e.preuve, maintenant)} petit /></td>
                  <td className="py-2 pe-3"><Val c={CELLULE_PRESENCE_CONFIRMEE} petit /></td>
                  <td className="py-2"><Val c={CELLULE_PRESENCE_REELLE} petit /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {modifiable ? (
        <section className="bg-white rounded-2xl border border-red-100 p-5 text-sm">
          <h2 className="font-semibold text-red-700 mb-2">Annuler</h2>
          <form action={annulerLiveAction} className="space-y-2">
            <input type="hidden" name="id" value={l.live.id} />
            {l.serie ? (
              <div className="space-y-1">
                <label className="flex items-center gap-2"><input type="radio" name="portee" value="occurrence" defaultChecked /> Cette occurrence seulement</label>
                <label className="flex items-center gap-2"><input type="radio" name="portee" value="serie" /> Toutes les occurrences à venir de la série</label>
              </div>
            ) : <input type="hidden" name="portee" value="occurrence" />}
            <input name="raison" maxLength={300} placeholder="Raison (visible par l'administration)" className="w-full border border-gray-200 rounded-xl px-3 py-2" />
            <label className="flex items-center gap-2"><input type="checkbox" name="confirmation" value="oui" /> Je confirme l&apos;annulation (les rappels prévus passent en « annulé » ; aucun message n&apos;est envoyé aux élèves).</label>
            <BoutonEnvoi libelle="Annuler le live" className="bg-red-600 text-white px-4 py-2 rounded-xl font-semibold hover:bg-red-700" />
          </form>
        </section>
      ) : null}
    </div>
  );
}
