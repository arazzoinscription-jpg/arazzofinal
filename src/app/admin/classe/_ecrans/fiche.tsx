import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, CalendarPlus, ClipboardList, Send, UserRound } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { voitEleve, type Espace } from "@/lib/espace/portee";
import { lireReglages } from "@/lib/student-care/load";
import { LIBELLE_STATUT } from "@/lib/student-care/rules";
import { dateCourte, dateHeure, estJourValide, ilYA, joursDepuis } from "@/lib/student-care/time";
import {
  celluleActivite, celluleConnexion, celluleLeconConsultee, celluleQuiz, celluleTravaux, celluleVideo, type Cellule,
} from "@/lib/student-care/display";
import { chargerFiche } from "@/lib/classe/load";
import { lireTravauxEleve } from "@/lib/classe/travaux";
import { TravauxEleve } from "../travaux";
import { LIBELLE_TEINTE, initiales, teinte } from "@/lib/classe/vue";
import { STYLE_TEINTE } from "../teintes";
import { modeleMessage } from "@/lib/classe/communication";
import { emailConfigure } from "@/lib/classe/commande";
import { BadgeAction, Val } from "../../suivi/cellule";
import { Avatar } from "../carte";
import { Communication } from "../[id]/communication";


const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PALIER: Record<string, string> = {
  reminder_7: "Relance d'inactivité (7 j)", motivation_14: "Relance d'inactivité (14 j)", direct_30: "Relance d'inactivité (30 j)", notify_teacher_60: "Alerte formatrice (60 j)",
};
const RAPPEL: Record<string, string> = { continue: "Rappel « Continuez votre cours »", practical: "Rappel « Envoyez votre travail »" };

function Panneau({ titre, children, className = "" }: { titre: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`min-w-0 bg-white rounded-2xl border border-gray-100 p-4 sm:p-5 ${className}`}>
      <h2 className="font-semibold text-gray-900 mb-3 font-dm">{titre}</h2>
      {children}
    </section>
  );
}

function Indicateur({ libelle, c }: { libelle: string; c: Cellule }) {
  return (
    <div className="rounded-xl bg-gray-50 px-3 py-2.5">
      <div className="text-[11px] uppercase tracking-wide text-gray-400">{libelle}</div>
      <div className="mt-0.5"><Val c={c} /></div>
    </div>
  );
}

/** Anneau de progression (SVG) — rien n'est affiché si la progression n'existe pas. */
function Anneau({ pct }: { pct: number }) {
  const r = 26; const tour = 2 * Math.PI * r; const v = Math.min(100, Math.max(0, pct));
  return (
    <svg viewBox="0 0 64 64" className="w-16 h-16 flex-shrink-0" role="img" aria-label={`${v} % terminés`}>
      <circle cx="32" cy="32" r={r} fill="none" stroke="#f1f0f7" strokeWidth="7" />
      <circle cx="32" cy="32" r={r} fill="none" stroke="#FE7223" strokeWidth="7" strokeLinecap="round"
        strokeDasharray={`${(v / 100) * tour} ${tour}`} transform="rotate(-90 32 32)" />
      <text x="32" y="36" textAnchor="middle" className="fill-gray-800" style={{ fontSize: 13, fontWeight: 700 }}>{v}%</text>
    </svg>
  );
}

type Evenement = { le: string; icone: string; texte: string };

/** Fiche élève de « Ma classe » — introuvable si l'élève n'est inscrite à aucun cours de l'espace. */
export async function EcranFicheClasse({ espace, params, searchParams }: { espace: Espace; params: { id: string }; searchParams: Record<string, string | string[] | undefined> }) {
  const b = espace.base;
  if (!UUID.test(params.id)) notFound();

  const admin = createAdminClient();
  const etat = await lireReglages(admin);
  if (!etat.ok) redirect(`${b}/classe`);
  const d = Array.isArray(searchParams.depuis) ? searchParams.depuis[0] : searchParams.depuis;
  const jourDebut = estJourValide(d) ? d : etat.reglages.start_date;
  if (!jourDebut) redirect(`${b}/classe`);

  const maintenant = new Date();
  const fiche = await chargerFiche(admin, params.id, { jourDebut, seuils: etat.reglages.seuils, maintenant });
  if (!fiche || !voitEleve(espace, fiche.detail.suivi.formations)) notFound();
  const { detail, avatar } = fiche;
  const s = detail.suivi;
  // Ses travaux pratiques à ELLE (formatrice : seulement ceux de ses cours).
  const { travaux, complet: travauxComplets } = await lireTravauxEleve(admin, s.user_id, espace.cours);
  const t = teinte(s);
  const style = STYLE_TEINTE[t];
  const terminees = s.formations.filter((f) => f.pourcentage === 100 || f.certificat_le);
  const ordonnees = [...s.formations].sort((a, b) => (a === s.reference ? -1 : b === s.reference ? 1 : (a.niveau ?? "Z").localeCompare(b.niveau ?? "Z")));
  const modele = modeleMessage(s.nom, s.action.code, s.reference?.titre ?? null);

  // Historique pertinent : activité réelle + inscriptions + relances et envois DÉJÀ enregistrés.
  const evenements: Evenement[] = [
    ...s.formations.map((f) => ({ le: f.inscrite_le, icone: "🎓", texte: `Inscription : ${f.titre}` })),
    ...s.formations.filter((f) => f.derniere_lecon_le).map((f) => ({ le: f.derniere_lecon_le as string, icone: "✅", texte: `Leçon terminée${f.derniere_lecon_titre ? ` : ${f.derniere_lecon_titre}` : ""} (${f.titre})` })),
    ...s.formations.filter((f) => f.certificat_le).map((f) => ({ le: f.certificat_le as string, icone: "🏅", texte: `Certificat : ${f.titre}` })),
    ...detail.reactivations.map((r) => ({ le: r.sent_at, icone: "🔔", texte: PALIER[r.stage] ?? `Relance (${r.stage})` })),
    ...detail.rappels.map((r) => ({ le: r.sent_at, icone: "🔔", texte: `${RAPPEL[r.kind] ?? r.kind}${r.lecon ? ` — ${r.lecon}` : ""}` })),
    ...detail.notifications.map((n) => ({ le: n.created_at, icone: "📣", texte: `Notification : ${n.title}${n.read_at ? " (lue)" : ""}` })),
    ...detail.emails.map((m) => ({ le: m.created_at, icone: "✉️", texte: `E-mail ${m.status === "sent" ? "journalisé « envoyé »" : `« ${m.status} »`} : ${m.subject ?? m.category}` })),
  ].sort((a, b) => b.le.localeCompare(a.le)).slice(0, 14);

  const jours = s.jours_sans_activite;
  const boutonRaccourci = "inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-semibold transition";

  return (
    <div className="px-4 lg:px-8 py-6 max-w-6xl">
      <Link href={`${b}/classe`} className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-3">
        <ArrowLeft size={15} /> Retour à la classe
      </Link>

      <header className={`bg-white rounded-3xl border border-gray-100 border-t-4 ${style.carte} p-5 sm:p-6 mb-4 shadow-sm`}>
        <div className="flex flex-col sm:flex-row sm:items-center gap-5">
          <Avatar c={{ nom: s.nom, initiales: initiales(s.nom), avatar, teinte: t }} taille="lg" />
          <div className="flex-1 min-w-0">
            <h1 className="font-playfair text-3xl font-bold text-gray-900">{s.nom}</h1>
            <div className="text-sm text-gray-500 break-all">{s.email ?? "E-mail non renseigné"}{s.pseudo ? ` · @${s.pseudo}` : ""}</div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {s.niveaux.map((n) => <span key={n} className="px-2 py-0.5 rounded-md text-xs font-bold bg-[#5B16F9]/10 text-[#5B16F9]">{n}</span>)}
              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${style.pastille}`}>
                <span className={`w-2 h-2 rounded-full ${style.point}`} aria-hidden />{LIBELLE_TEINTE[t]}
              </span>
              <BadgeAction code={s.action.code} />
            </div>
            {s.action.raison ? <p className="text-sm text-gray-600 mt-2">{s.action.raison}</p> : null}
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link href={`${b}/classe`} className={`${boutonRaccourci} bg-gray-100 text-gray-700 hover:bg-gray-200`}><ArrowLeft size={15} /> La classe</Link>
          <Link href={`${b}/suivi/${s.user_id}`} className={`${boutonRaccourci} bg-[#5B16F9]/10 text-[#5B16F9] hover:bg-[#5B16F9]/15`}><ClipboardList size={15} /> Consulter le suivi complet</Link>
          <Link href={`/communaute/u/${s.user_id}`} className={`${boutonRaccourci} bg-white border border-gray-200 text-gray-700 hover:bg-gray-50`}><UserRound size={15} /> Profil communauté</Link>
          <a href="#communication" className={`${boutonRaccourci} bg-orange-500 text-white hover:bg-orange-600`}><Send size={15} /> Préparer une communication</a>
          <Link href={`${b}/lives/nouveau`} className={`${boutonRaccourci} bg-white border border-gray-200 text-gray-700 hover:bg-gray-50`}><CalendarPlus size={15} /> Programmer un live</Link>
        </div>
      </header>

      {detail.hors_periode ? (
        <div className="mb-4 rounded-xl bg-gray-50 border border-gray-100 px-4 py-2 text-sm text-gray-600">
          Aucune inscription depuis le {dateCourte(`${jourDebut}T12:00:00Z`)} : fiche affichée pour information, hors de la classe actuelle.
        </div>
      ) : null}
      {s.importee ? (
        <div className="mb-4 rounded-xl bg-sky-50 border border-sky-100 px-4 py-2 text-sm text-sky-800">
          Inscription importée de l&apos;ancien système : l&apos;historique antérieur n&apos;a pas été repris (seule l&apos;activité depuis l&apos;import est connue).
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 items-start">
        <Panneau titre="Progression" className="lg:col-span-2">
          <p className="text-xs text-gray-500 mb-3">
            {terminees.length ? `${terminees.length} cours terminé${terminees.length > 1 ? "s" : ""} (100 % ou certificat).` : "Aucun cours terminé pour l'instant."}
            {" "}Les anciens modules sont montrés à part, jamais additionnés au niveau.
          </p>
          <ul className="space-y-3">
            {ordonnees.map((f) => (
              <li key={f.enrollment_id} className={`flex items-center gap-4 rounded-2xl border px-3 py-3 ${f === s.reference ? "border-orange-200 bg-orange-50/40" : "border-gray-100"}`}>
                {f.pourcentage !== null
                  ? <Anneau pct={f.pourcentage} />
                  : <div className="w-16 h-16 rounded-full border-2 border-dashed border-gray-200 flex items-center justify-center text-[10px] text-gray-400 text-center leading-tight flex-shrink-0">sans<br />leçon</div>}
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 truncate">{f.titre}</div>
                  <div className="text-xs text-gray-500 mt-0.5 flex flex-wrap gap-x-3">
                    {f.niveau ? <span className="font-bold text-[#5B16F9]">{f.niveau}</span> : <span>{f.genre === "ancien_module" ? "Ancien module" : "Autre formation"}</span>}
                    <span>{f.lecons_faites}/{f.lecons_total} leçons</span>
                    {f.modules_total ? <span>{f.modules_faits}/{f.modules_total} modules</span> : null}
                    <span>inscrite le {dateCourte(f.inscrite_le)}</span>
                    {f.certificat_le ? <span className="text-emerald-700 font-semibold">🏅 certificat {dateCourte(f.certificat_le)}</span> : null}
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5 truncate">
                    {f.derniere_lecon_le ? `Dernière leçon : ${f.derniere_lecon_titre ?? "terminée"} — ${dateCourte(f.derniere_lecon_le)}` : "Aucune leçon terminée"}
                  </div>
                </div>
              </li>
            ))}
          </ul>
          {s.historique ? (
            <p className="text-xs text-gray-500 mt-3">Anciens modules : {s.historique.lecons_faites} leçon(s) sur {s.historique.cours} module(s){s.historique.derniere_le ? `, la dernière le ${dateCourte(s.historique.derniere_le)}` : ""}.</p>
          ) : null}
        </Panneau>

        <Panneau titre="Dernière activité pédagogique">
          <div className={`rounded-2xl px-4 py-4 ${style.pastille}`}>
            {s.derniere_activite ? (
              <>
                <div className="text-2xl font-playfair font-bold">{ilYA(joursDepuis(s.derniere_activite.le, maintenant))}</div>
                <div className="text-sm">{{ lecon: "Leçon terminée", quiz: "Quiz", travail: "Travail pratique" }[s.derniere_activite.genre]} · {dateHeure(s.derniere_activite.le)}</div>
              </>
            ) : <div className="text-sm font-semibold">Aucune activité pédagogique enregistrée</div>}
            <div className="text-xs mt-1 opacity-80">{LIBELLE_STATUT[s.statut]}</div>
          </div>
          <div className="mt-3 space-y-2">
            <Indicateur libelle="Dernière connexion" c={celluleConnexion(s, maintenant)} />
            <Indicateur libelle="Leçon ouverte (signal)" c={celluleLeconConsultee(s, maintenant)} />
            <Indicateur libelle="Vidéo (signal)" c={celluleVideo(s, maintenant)} />
          </div>
          <p className="text-[11px] text-gray-400 mt-2">Connexions et vidéos sont des signaux : ils ne prouvent pas une progression.</p>
        </Panneau>

        <Panneau titre="Quiz et exercices pratiques">
          <div className="space-y-2">
            <Indicateur libelle="Quiz" c={celluleQuiz(s)} />
            <Indicateur libelle="Travaux pratiques" c={celluleTravaux(s)} />
            <Indicateur libelle="Questions posées" c={s.questions.posees ? { etat: "valeur", texte: `${s.questions.posees} (dont ${s.questions.sans_reponse} sans réponse)` } : { etat: "aucune", texte: "Aucune question" }} />
          </div>
          <div className="mt-3 flex flex-wrap gap-3 text-xs">
            <Link className="text-orange-600 hover:underline" href={`/formateur/pratiques?eleve=${s.user_id}`}>Ses travaux à corriger →</Link>
            <Link className="text-orange-600 hover:underline" href="/formateur/questions">Questions des élèves →</Link>
          </div>
        </Panneau>

        <Panneau titre="Blocages et progression">
          {jours !== null && jours > 0 ? (
            <p className="text-sm mb-2"><b>{jours} jour{jours > 1 ? "s" : ""}</b> sans activité pédagogique.</p>
          ) : s.derniere_activite ? <p className="text-sm mb-2 text-emerald-700">Activité aujourd&apos;hui.</p> : null}
          {s.statut === "sans_activite" ? <p className="text-sm mb-2 text-violet-700">Se connecte mais n&apos;a encore jamais progressé.</p> : null}
          {s.statut === "jamais_connectee" ? <p className="text-sm mb-2 text-slate-600">Ne s&apos;est jamais connectée.</p> : null}
          {s.blocages.length ? (
            <ul className="space-y-1.5">{s.blocages.map((b) => <li key={b.code} className="rounded-lg bg-red-50 text-red-700 text-sm px-3 py-1.5">⚠️ {b.libelle}</li>)}</ul>
          ) : <p className="text-sm text-gray-500">Aucun blocage détecté.</p>}
          {s.taches_enseignante.length ? (
            <>
              <h3 className="text-xs font-semibold text-gray-500 mt-3 mb-1">À faire par l&apos;enseignante</h3>
              <ul className="space-y-1.5">{s.taches_enseignante.map((b) => <li key={b.code} className="rounded-lg bg-violet-50 text-violet-700 text-sm px-3 py-1.5">📝 {b.libelle}</li>)}</ul>
            </>
          ) : null}
        </Panneau>

        <Panneau titre="Inscription">
          <dl className="text-sm space-y-1.5">
            <div className="flex justify-between gap-3"><dt className="text-gray-500">Première inscription</dt><dd className="text-right">{dateCourte(s.premiere_inscription)}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-gray-500">Dans la classe depuis</dt><dd className="text-right">{dateCourte(s.suivie_depuis)}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-gray-500">Formations</dt><dd className="text-right">{s.formations.length}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-gray-500">Certificats</dt><dd className="text-right">{s.certificats.nombre}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-gray-500">Téléphone</dt><dd className="text-right">{s.telephone ? <>{s.telephone.valeur}<span className="block text-[11px] text-gray-400">{s.telephone.source}</span></> : <span className="text-gray-400 italic">non disponible</span>}</dd></div>
          </dl>
        </Panneau>

        <div className="lg:col-span-3 min-w-0"><TravauxEleve userId={s.user_id} travaux={travaux} complet={travauxComplets} /></div>

        <Panneau titre="Historique" className="lg:col-span-3">
          {evenements.length === 0 ? <p className="text-sm text-gray-500">Aucun événement enregistré.</p> : (
            <ol className="relative border-s-2 border-gray-100 ms-2 space-y-3">
              {evenements.map((e, i) => (
                <li key={`${e.le}-${i}`} className="ms-4">
                  <span className="absolute -start-[9px] mt-1 w-4 h-4 rounded-full bg-white border-2 border-gray-200" aria-hidden />
                  <div className="text-sm text-gray-800">{e.icone} {e.texte}</div>
                  <div className="text-xs text-gray-400">{dateHeure(e.le)}</div>
                </li>
              ))}
            </ol>
          )}
          <p className="text-[11px] text-gray-400 mt-3">
            Relances et envois déjà enregistrés par le site (une notification enregistrée n&apos;est pas une preuve de lecture). Les messages envoyés par Arazzo OS n&apos;apparaissent pas ici.
          </p>
        </Panneau>
      </div>

      <Communication
        base={b}
        serviceEmail={emailConfigure(process.env.RESEND_API_KEY)}
        eleve={{ id: s.user_id, nom: s.nom, email: s.email, telephone: s.telephone?.valeur ?? null, telephoneSource: s.telephone?.source ?? null }}
        modele={modele}
      />
    </div>
  );
}
