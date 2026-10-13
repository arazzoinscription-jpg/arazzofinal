import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { voitEleve, type Espace } from "@/lib/espace/portee";
import { chargerEleve, lireReglages } from "@/lib/student-care/load";
import {
  CONSERVATION_JOURS, celluleActivite, celluleConnexion, celluleLeconConsultee, celluleProgression,
  celluleQuiz, celluleTelephone, celluleTravaux, celluleVideo, celluleCertificats, type Cellule,
} from "@/lib/student-care/display";
import { dateCourte, dateHeure, estJourValide, joursDepuis } from "@/lib/student-care/time";
import { Val, BadgeAction, BadgeStatut, BadgeNiveau, Barre } from "../cellule";


const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const GENRE = { niveau: "Cours de niveau", ancien_module: "Ancien module (historique)", autre: "Autre formation" } as const;
const PALIER: Record<string, string> = {
  reminder_7: "Inactivité 7 j", motivation_14: "Inactivité 14 j", direct_30: "Inactivité 30 j", notify_teacher_60: "Alerte formatrice 60 j",
};
const RAPPEL: Record<string, string> = { continue: "« Continuez votre cours »", practical: "« Envoyez votre travail »" };

function Bloc({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <section className="bg-white rounded-2xl border border-gray-100 p-5">
      <h2 className="font-semibold text-gray-900 mb-3">{titre}</h2>
      {children}
    </section>
  );
}

function Ligne({ libelle, c }: { libelle: string; c: Cellule }) {
  return (
    <div className="flex flex-wrap gap-x-3 py-1 border-b border-gray-50 last:border-0">
      <span className="w-48 shrink-0 text-xs text-gray-500">{libelle}</span>
      <span className="flex-1 min-w-0"><Val c={c} /></span>
    </div>
  );
}

/** Liste vide : « aucun envoi » si la période est couverte, « indisponible » au-delà de la conservation. */
function Vide({ depuis, conservation, maintenant }: { depuis: string; conservation: number; maintenant: Date }) {
  const j = joursDepuis(depuis, maintenant) ?? 0;
  return j > conservation
    ? <p className="text-sm text-amber-700 italic">Donnée indisponible au-delà de {conservation} jours (journal purgé).</p>
    : <p className="text-sm text-gray-500">Aucun envoi enregistré.</p>;
}

/** Fiche de suivi — introuvable si l'élève n'est inscrite à aucun cours de l'espace. */
export async function EcranFicheSuivi({ espace, params, searchParams }: { espace: Espace; params: { id: string }; searchParams: Record<string, string | string[] | undefined> }) {
  const b = espace.base;
  if (!UUID.test(params.id)) notFound();

  const admin = createAdminClient();
  const etat = await lireReglages(admin);
  if (!etat.ok) redirect(`${b}/suivi`);
  const d = Array.isArray(searchParams.depuis) ? searchParams.depuis[0] : searchParams.depuis;
  const jourDebut = estJourValide(d) ? d : etat.reglages.start_date;
  if (!jourDebut) redirect(`${b}/suivi`);

  const maintenant = new Date();
  const fiche = await chargerEleve(admin, params.id, { jourDebut, seuils: etat.reglages.seuils, maintenant });
  if (!fiche || !voitEleve(espace, fiche.suivi.formations)) notFound();
  const s = fiche.suivi;
  const retour = `${b}/suivi${estJourValide(d) ? `?depuis=${d}` : ""}`;

  return (
    <div className="px-4 lg:px-8 py-6 max-w-5xl">
      <Link href={retour} className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-3">
        <ArrowLeft size={15} /> Retour au suivi
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <h1 className="font-playfair text-3xl font-bold text-gray-900">{s.nom}</h1>
          <div className="text-sm text-gray-500 break-all">{s.email ?? "—"}{s.pseudo ? ` · @${s.pseudo}` : ""}</div>
          <div className="mt-1"><Val c={celluleTelephone(s)} /></div>
        </div>
        <div className="text-right space-y-1">
          <BadgeStatut statut={s.statut} />
          <div><BadgeAction code={s.action.code} /></div>
          {s.action.raison ? <div className="text-xs text-gray-600 max-w-xs">{s.action.raison}</div> : null}
        </div>
      </div>

      {fiche.hors_periode ? (
        <div className="mb-4 rounded-xl bg-gray-50 border border-gray-100 px-4 py-2 text-sm text-gray-600">
          Aucune inscription de cette élève depuis le {dateCourte(`${jourDebut}T12:00:00Z`)} : fiche affichée pour information, hors période de suivi.
        </div>
      ) : null}
      {s.importee ? (
        <div className="mb-4 rounded-xl bg-sky-50 border border-sky-100 px-4 py-2 text-sm text-sky-800">
          Élève importée de l&apos;ancien système (inscription antérieure au 2 juin 2026, sans commande) : son historique antérieur n&apos;a pas été repris.
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <Bloc titre="Connexion et activité">
          <Ligne libelle="Dernière authentification" c={celluleConnexion(s, maintenant)} />
          <Ligne libelle="Connexion par mot de passe (journal)" c={s.derniere_connexion_journal
            ? { etat: "valeur", texte: dateHeure(s.derniere_connexion_journal) }
            : { etat: "non_enregistree", texte: "Aucune dans le journal", detail: "Le journal ne note que les connexions par mot de passe (pas les liens d'accès)." }} />
          <Ligne libelle="Dernière activité réelle" c={celluleActivite(s, maintenant)} />
          <Ligne libelle="Signal : vidéo" c={celluleVideo(s, maintenant)} />
          <Ligne libelle="Signal : leçon ouverte" c={celluleLeconConsultee(s, maintenant)} />
          <Ligne libelle="Questions posées" c={s.questions.posees ? { etat: "valeur", texte: `${s.questions.posees} (dont ${s.questions.sans_reponse} sans réponse)` } : { etat: "aucune", texte: "Aucune question" }} />
        </Bloc>

        <Bloc titre="Évaluations">
          <Ligne libelle="Quiz" c={celluleQuiz(s)} />
          <Ligne libelle="Travaux pratiques" c={celluleTravaux(s)} />
          <Ligne libelle="Certificats" c={celluleCertificats(s)} />
          <div className="mt-3 flex flex-wrap gap-3 text-xs">
            <Link className="text-orange-600 hover:underline" href="/formateur/pratiques">Travaux à corriger →</Link>
            <Link className="text-orange-600 hover:underline" href="/formateur/questions">Questions des élèves →</Link>
          </div>
        </Bloc>
      </div>

      {(s.blocages.length || s.taches_enseignante.length) ? (
        <div className="grid gap-4 md:grid-cols-2 mt-4">
          {s.blocages.length ? (
            <Bloc titre="Blocages côté élève">
              <ul className="list-disc ms-5 text-sm text-red-700 space-y-1">{s.blocages.map((b) => <li key={b.code}>{b.libelle}</li>)}</ul>
            </Bloc>
          ) : null}
          {s.taches_enseignante.length ? (
            <Bloc titre="À faire par l'enseignante">
              <ul className="list-disc ms-5 text-sm text-violet-700 space-y-1">{s.taches_enseignante.map((b) => <li key={b.code}>{b.libelle}</li>)}</ul>
            </Bloc>
          ) : null}
        </div>
      ) : null}

      <section className="bg-white rounded-2xl border border-gray-100 p-5 mt-4 overflow-x-auto">
        <h2 className="font-semibold text-gray-900 mb-1">Formations</h2>
        <p className="text-xs text-gray-500 mb-3">Une ligne par cours. Les anciens modules ne sont jamais additionnés au cours de niveau (leurs leçons y ont été recopiées).</p>
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-gray-500">
            <tr><th className="py-2 pe-3">Formation</th><th className="py-2 pe-3">Nature</th><th className="py-2 pe-3">Inscription</th><th className="py-2 pe-3">Progression</th><th className="py-2 pe-3">Modules</th><th className="py-2 pe-3">Dernière leçon</th><th className="py-2">Certificat</th></tr>
          </thead>
          <tbody className="divide-y divide-gray-50 align-top">
            {s.formations.map((f) => (
              <tr key={f.enrollment_id} className={f === s.reference ? "bg-orange-50/40" : ""}>
                <td className="py-2 pe-3">
                  <div className="font-medium text-gray-900">{f.titre}</div>
                  {f === s.reference ? <div className="text-[11px] text-orange-700">Formation de référence</div> : null}
                </td>
                <td className="py-2 pe-3 text-xs">{f.niveau ? <BadgeNiveau niveau={f.niveau} /> : null} {GENRE[f.genre]}</td>
                <td className="py-2 pe-3 text-xs">{dateCourte(f.inscrite_le)}{f.suivie ? "" : <span className="block text-gray-400">antérieure au suivi</span>}</td>
                <td className="py-2 pe-3"><Val c={celluleProgression(f)} petit /><Barre pct={f.pourcentage} /></td>
                <td className="py-2 pe-3 text-xs">{f.modules_total ? `${f.modules_faits}/${f.modules_total}` : "—"}</td>
                <td className="py-2 pe-3 text-xs">{f.derniere_lecon_le
                  ? <>{f.derniere_lecon_titre ?? "Leçon terminée"}<span className="block text-gray-400">{dateCourte(f.derniere_lecon_le)}</span></>
                  : <span className="text-gray-400">Aucune</span>}</td>
                <td className="py-2 text-xs">{f.certificat_le ? dateCourte(f.certificat_le) : <span className="text-gray-400">—</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <div className="grid gap-4 md:grid-cols-2 mt-4">
        <Bloc titre="Relances automatiques déjà envoyées (système existant)">
          {fiche.reactivations.length === 0 && fiche.rappels.length === 0
            ? <p className="text-sm text-gray-500">Aucune relance enregistrée.</p>
            : (
              <ul className="text-sm space-y-1">
                {fiche.reactivations.map((r) => <li key={`r${r.sent_at}`}>🔔 {PALIER[r.stage] ?? r.stage} — {dateHeure(r.sent_at)}</li>)}
                {fiche.rappels.map((r) => <li key={`l${r.sent_at}${r.kind}`}>🔔 {RAPPEL[r.kind] ?? r.kind}{r.lecon ? ` (${r.lecon})` : ""} — {dateHeure(r.sent_at)}</li>)}
              </ul>
            )}
          <p className="text-[11px] text-gray-400 mt-2">Journaux d&apos;anti-doublon conservés sans limite. Une relance enregistrée n&apos;est pas une preuve de lecture.</p>
        </Bloc>

        <Bloc titre="Dernières notifications et e-mails">
          <h3 className="text-xs font-semibold text-gray-500 mb-1">Notifications (5 dernières)</h3>
          {fiche.notifications.length
            ? <ul className="text-sm space-y-1 mb-3">{fiche.notifications.map((n) => <li key={`${n.created_at}${n.title}`}>{n.title} <span className="text-xs text-gray-400">— {dateHeure(n.created_at)}{n.read_at ? " · lue" : ""}</span></li>)}</ul>
            : <div className="mb-3"><Vide depuis={s.premiere_inscription} conservation={CONSERVATION_JOURS.notifications} maintenant={maintenant} /></div>}
          <h3 className="text-xs font-semibold text-gray-500 mb-1">E-mails (5 derniers)</h3>
          {fiche.emails.length
            ? <ul className="text-sm space-y-1">{fiche.emails.map((m) => <li key={`${m.created_at}${m.subject}`}>{m.subject ?? m.category} <span className="text-xs text-gray-400">— {m.status} · {dateHeure(m.created_at)}</span></li>)}</ul>
            : <Vide depuis={s.premiere_inscription} conservation={CONSERVATION_JOURS.email_log} maintenant={maintenant} />}
          <p className="text-[11px] text-gray-400 mt-2">Conservation : {CONSERVATION_JOURS.notifications} jours. Les messages envoyés par Arazzo OS ne sont pas visibles ici.</p>
        </Bloc>
      </div>

      {b === "/admin" && s.action.code === "accueillir" && s.statut === "jamais_connectee" && s.email ? (
        <p className="mt-4 text-sm text-gray-600">
          Accès au compte : le lien d&apos;accès se gère depuis la page{" "}
          <Link className="text-orange-600 hover:underline" href={`/admin/etudiants?q=${encodeURIComponent(s.email)}`}>Étudiants inscrits</Link>{" "}
          (rien n&apos;est envoyé depuis cette fiche).
        </p>
      ) : null}
    </div>
  );
}
