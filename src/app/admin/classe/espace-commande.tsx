"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { CalendarPlus, ChevronDown, Mail, Megaphone, MessageCircle, Radio, type LucideIcon } from "lucide-react";
import type { CodeNiveau } from "@/lib/student-care/levels";
import type { CibleCommande, EtapeEnvoi } from "@/lib/classe/commande";
import { prenom } from "@/lib/classe/communication";
import { ouvrirMessagerie } from "@/lib/classe/ouvrir-messagerie";
import { apercuAnnonce, publierAnnonce, type ApercuAnnonce } from "./annonce-api";
import { EnvoiEmail } from "./envoi-email";
import { Etapes } from "./etapes";

export interface NiveauCommande { id: string; code: CodeNiveau; titre: string }
export interface EleveCommande { id: string; nom: string; niveaux: CodeNiveau[] }
export interface GroupeCommande { id: string; nom: string; membres: number }

type Panneau = "message" | "annonce" | "email" | null;

const champ = "mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#5B16F9]/30";

function Tuile({ icone: Icone, titre, sous, ton, actif, large, ...p }: {
  icone: LucideIcon; titre: string; sous: React.ReactNode; ton: string; actif?: boolean;
  /** Occupe toute la ligne sur téléphone (tuile seule en dernière ligne). */
  large?: boolean;
} & ({ href: string; onClick?: never } | { onClick: () => void; href?: never })) {
  const corps = (
    <>
      <span className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-black/10 flex items-center justify-center flex-shrink-0" aria-hidden><Icone size={19} /></span>
      <span className="text-left leading-tight min-w-0">
        <span className="block text-[13px] sm:text-sm font-semibold">{titre}</span>
        <span className="block text-[10.5px] sm:text-[11px] opacity-85 mt-0.5 line-clamp-2">{sous}</span>
      </span>
      {"onClick" in p && p.onClick ? <ChevronDown size={16} className={`hidden sm:block ms-auto flex-shrink-0 transition ${actif ? "rotate-180" : ""}`} aria-hidden /> : null}
    </>
  );
  const classes = `flex flex-col items-start sm:flex-row sm:items-center gap-2 sm:gap-3 rounded-2xl px-3 sm:px-3.5 py-2.5 sm:py-3 h-full bg-gradient-to-br shadow-sm border border-black/5 hover:shadow-md transition text-left w-full focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5B16F9] ${ton} ${actif ? "ring-2 ring-offset-2 ring-[#5B16F9]" : ""} ${large ? "col-span-2 sm:col-span-1" : ""}`;
  if (p.href) return <Link href={p.href} className={classes}>{corps}</Link>;
  return <button type="button" className={classes} onClick={p.onClick} aria-expanded={actif}>{corps}</button>;
}

/** C — Message individuel : brouillon pré-rempli dans la messagerie du site ; l'enseignante envoie elle-même. */
function PanneauMessage({ base, eleves }: { base: string; eleves: EleveCommande[] }) {
  const [id, setId] = useState("");
  const [texte, setTexte] = useState("");
  const [ouvert, setOuvert] = useState(false);
  const e = eleves.find((x) => x.id === id) ?? null;
  function choisir(v: string) {
    setId(v); setOuvert(false);
    const x = eleves.find((y) => y.id === v);
    if (x && (!texte.trim() || /^Bonjour [^,\n]*,\s*$/.test(texte))) setTexte(`Bonjour ${prenom(x.nom)},\n\n`);
  }
  return (
    <div className="grid gap-3 md:grid-cols-[260px_1fr]">
      <label className="block text-xs text-gray-500">Élève
        <select value={id} onChange={(ev) => choisir(ev.target.value)} className={champ}>
          <option value="">— Choisir une élève ({eleves.length}) —</option>
          {eleves.map((x) => <option key={x.id} value={x.id}>{x.nom}{x.niveaux.length ? ` · ${x.niveaux.join(", ")}` : ""}</option>)}
        </select>
        {e ? <Link href={`${base}/classe/${e.id}#communication`} className="mt-2 inline-block text-xs text-[#5B16F9] hover:underline">Ouvrir sa fiche (suivi, WhatsApp, e-mail) →</Link> : null}
      </label>
      <div className="space-y-2">
        <label className="block text-xs text-gray-500">Message
          <textarea value={texte} onChange={(ev) => { setTexte(ev.target.value); setOuvert(false); }} rows={5} className={`${champ} leading-relaxed`} placeholder="Choisissez une élève : un début de message est proposé." />
        </label>
        <button type="button" disabled={!e || texte.trim().length < 2}
          onClick={() => { if (!e) return; ouvrirMessagerie({ id: e.id, nom: e.nom, texte }); setOuvert(true); }}
          className="inline-flex items-center gap-2 rounded-xl bg-[#5B16F9] px-4 py-2 text-sm font-semibold text-white hover:bg-[#4a10d0] disabled:opacity-40">
          <MessageCircle size={16} aria-hidden /> Ouvrir la conversation pré-remplie
        </button>
        {ouvert ? (
          <Etapes etape="prepare" detail={`la conversation avec ${prenom(e?.nom ?? "")} est ouverte dans la bulle « Messagerie », avec votre texte : c'est vous qui appuyez sur « Envoyer ».`} />
        ) : <p className="text-[11px] text-gray-500">Le site n&apos;envoie rien tout seul : la messagerie s&apos;ouvre, vous relisez et envoyez.</p>}
      </div>
    </div>
  );
}

/** D — Annonce de classe : aperçu (nombre de destinataires) → confirmation → publication via le Centre d'annonces. */
function PanneauAnnonce({ niveau, serviceEmail }: { niveau: NiveauCommande | null; serviceEmail: boolean }) {
  const [titre, setTitre] = useState("");
  const [texte, setTexte] = useState("");
  const [email, setEmail] = useState(false);
  const [apercu, setApercu] = useState<ApercuAnnonce | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [confirme, setConfirme] = useState(false);
  const [etape, setEtape] = useState<EtapeEnvoi | null>(null);
  const [detail, setDetail] = useState<string | null>(null);
  const [lecture, setLecture] = useState(false);
  const enCours = useRef(false);

  function modifier(f: () => void) { f(); setApercu(null); setConfirme(false); setErreur(null); if (!enCours.current) { setEtape(null); setDetail(null); } }

  if (!niveau) {
    return <p className="text-sm text-gray-600">Choisissez d&apos;abord le <b>niveau</b> (N1, N2 ou N3) en haut de l&apos;Espace de commande : l&apos;annonce part aux élèves inscrites à ce niveau.</p>;
  }
  const valide = titre.trim().length >= 2 && texte.trim().length >= 2;

  async function voir() {
    if (!niveau) return;
    setLecture(true); setErreur(null);
    const r = await apercuAnnonce({ titre: titre.trim(), texte: texte.trim(), courseId: niveau.id, email: email && serviceEmail });
    setLecture(false);
    if (r.ok) { setApercu(r.donnees); setEtape("prepare"); setDetail(`publication possible à ${r.donnees.audience} élève(s) du ${niveau.code}.`); }
    else setErreur(r.erreur);
  }

  async function publier() {
    if (enCours.current || !niveau || !apercu || !confirme) return;
    enCours.current = true;
    setEtape("declenche"); setDetail(null);
    const r = await publierAnnonce({ titre: titre.trim(), texte: texte.trim(), courseId: niveau.id, email: email && serviceEmail });
    enCours.current = false;
    setConfirme(false);
    if (!r.ok) { setEtape(r.statut === 409 || r.statut === 403 || r.statut === 400 ? "bloque" : "echec"); setDetail(r.erreur); return; }
    const d = r.donnees;
    const morceaux = [`annonce enregistrée, ${d.notifications} notification(s) créée(s) dans l'espace des élèves`];
    if (email && serviceEmail) morceaux.push(`e-mails : ${d.emailsSent} confirmé(s) par le service${d.emailsSkipped ? `, ${d.emailsSkipped} ignoré(s)` : ""}${d.emailsFailed ? `, ${d.emailsFailed} échec(s)` : ""}`);
    if (d.emailsNonTentes) morceaux.push("aucun e-mail tenté (service non configuré)");
    setEtape(d.emailsFailed && d.emailsSent ? "partiel" : "confirme");
    setDetail(morceaux.join(" · ") + ".");
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="space-y-2">
        <p className="text-xs text-gray-500">Destinataires : élèves inscrites au <b className="text-gray-800">{niveau.code} — {niveau.titre}</b></p>
        <label className="block text-xs text-gray-500">Titre
          <input value={titre} onChange={(e) => modifier(() => setTitre(e.target.value))} maxLength={150} className={champ} placeholder="Ex. : Live de correction jeudi 20 h" />
        </label>
        <label className="block text-xs text-gray-500">Message
          <textarea value={texte} onChange={(e) => modifier(() => setTexte(e.target.value))} rows={5} className={`${champ} leading-relaxed`} placeholder="Votre message à la classe…" />
        </label>
        <label className={`flex items-start gap-2 text-sm ${serviceEmail ? "text-gray-700" : "text-gray-400"}`}>
          <input type="checkbox" checked={email && serviceEmail} disabled={!serviceEmail} onChange={(e) => modifier(() => setEmail(e.target.checked))} className="mt-1" />
          <span>Envoyer aussi par e-mail{serviceEmail ? "" : " — indisponible : service e-mail non configuré (seule la publication sur le site est possible)"}</span>
        </label>
        <button type="button" onClick={voir} disabled={!valide || lecture}
          className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50 disabled:opacity-50">
          {lecture ? "Lecture…" : "1. Aperçu et destinataires"}
        </button>
        {erreur ? <p className="rounded-xl bg-red-50 border border-red-100 px-3 py-2 text-sm text-red-700">{erreur}</p> : null}
      </div>

      <div className="space-y-2">
        {apercu ? (
          <>
            <div className="rounded-xl border border-orange-200 bg-orange-50/60 p-3">
              <div className="text-[11px] uppercase tracking-wide text-orange-700 font-semibold mb-1">Aperçu — tel que l&apos;élève le verra</div>
              <div className="font-semibold text-gray-900">📢 {titre.trim()}</div>
              <p className="text-sm text-gray-700 whitespace-pre-line mt-1">{texte.trim()}</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
              <div><b>{apercu.audience}</b> élève(s) du {niveau.code} recevront la notification dans leur espace.</div>
              {email && serviceEmail ? (
                <div className="text-xs text-gray-500 mt-0.5">E-mails possibles : {apercu.emailsPossibles} · désinscrites : {apercu.desinscrites} · sans adresse : {apercu.sansEmail}{apercu.categorieCoupee ? " · catégorie « annonces » coupée par l'administration" : ""}</div>
              ) : <div className="text-xs text-gray-500 mt-0.5">Aucun e-mail : publication sur le site uniquement.</div>}
              <label className="flex items-start gap-2 pt-2">
                <input type="checkbox" checked={confirme} disabled={apercu.audience === 0} onChange={(e) => setConfirme(e.target.checked)} className="mt-1" />
                <span>Je confirme la publication à <b>{apercu.audience}</b> élève(s) du {niveau.code}.</span>
              </label>
              <button type="button" onClick={publier} disabled={!confirme || etape === "declenche"}
                className="mt-2 inline-flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed">
                <Megaphone size={16} aria-hidden /> 2. Publier l&apos;annonce
              </button>
            </div>
          </>
        ) : <p className="text-xs text-gray-500 lg:pt-6">L&apos;aperçu affiche le nombre exact de destinataires avant toute publication.</p>}
        <Etapes etape={etape} detail={detail} />
      </div>
    </div>
  );
}

/** E — E-mail : une élève, le niveau choisi ou un groupe de l'espace. */
function PanneauEmail({ base, niveau, eleves, groupes, groupeCourant, serviceEmail }: {
  base: string; niveau: NiveauCommande | null; eleves: EleveCommande[]; groupes: GroupeCommande[]; groupeCourant: string | null; serviceEmail: boolean;
}) {
  const [type, setType] = useState<"eleve" | "niveau" | "groupe">(groupeCourant ? "groupe" : niveau ? "niveau" : "eleve");
  const [eleveId, setEleveId] = useState("");
  const [groupeId, setGroupeId] = useState(groupeCourant ?? "");
  const eleve = eleves.find((e) => e.id === eleveId) ?? null;
  const groupe = groupes.find((g) => g.id === groupeId) ?? null;
  const cible: CibleCommande | null = type === "eleve" ? (eleve ? { type: "eleve", id: eleve.id } : null)
    : type === "niveau" ? (niveau ? { type: "niveau", courseId: niveau.id } : null)
    : groupe ? { type: "groupe", id: groupe.id } : null;
  const libelle = type === "eleve" ? (eleve?.nom ?? "") : type === "niveau" ? (niveau ? `élèves du ${niveau.code}` : "") : (groupe ? `groupe « ${groupe.nom} »` : "");
  const puce = (actif: boolean) => `rounded-full border px-3 py-1.5 text-xs font-semibold ${actif ? "bg-[#5B16F9] border-[#5B16F9] text-white" : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"}`;
  return (
    <div className="grid gap-4 md:grid-cols-[260px_1fr]">
      <div className="space-y-2">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Type de destinataire">
          <button type="button" className={puce(type === "eleve")} onClick={() => setType("eleve")} aria-pressed={type === "eleve"}>Une élève</button>
          <button type="button" className={puce(type === "niveau")} onClick={() => setType("niveau")} aria-pressed={type === "niveau"}>{niveau ? `Niveau ${niveau.code}` : "Un niveau"}</button>
          {groupes.length ? <button type="button" className={puce(type === "groupe")} onClick={() => setType("groupe")} aria-pressed={type === "groupe"}>Un groupe</button> : null}
        </div>
        {type === "eleve" ? (
          <select value={eleveId} onChange={(e) => setEleveId(e.target.value)} className={champ} aria-label="Élève">
            <option value="">— Choisir une élève ({eleves.length}) —</option>
            {eleves.map((x) => <option key={x.id} value={x.id}>{x.nom}</option>)}
          </select>
        ) : null}
        {type === "niveau" && !niveau ? <p className="text-xs text-gray-600">Choisissez le niveau en haut de l&apos;Espace de commande.</p> : null}
        {type === "groupe" ? (
          <select value={groupeId} onChange={(e) => setGroupeId(e.target.value)} className={champ} aria-label="Groupe">
            <option value="">— Choisir un groupe —</option>
            {groupes.map((g) => <option key={g.id} value={g.id}>{g.nom} ({g.membres})</option>)}
          </select>
        ) : null}
        <p className="text-[11px] text-gray-500">Seules les élèves de votre espace sont comptées ; les comptes d&apos;équipe sont exclus. Les adresses ne sont jamais affichées.</p>
      </div>
      <EnvoiEmail base={base} cible={cible} libelleCible={libelle} serviceEmail={serviceEmail} />
    </div>
  );
}

/** « Espace de commande de l'enseignante » — les actions principales de la classe, en haut de « Ma classe ». */
export function EspaceCommande({ base, niveaux, niveau, changerNiveau, eleves, groupes, groupeCourant, direct, serviceEmail }: {
  base: string;
  niveaux: NiveauCommande[];
  niveau: CodeNiveau | null;
  changerNiveau: (n: CodeNiveau | null) => void;
  eleves: EleveCommande[];
  groupes: GroupeCommande[];
  groupeCourant: string | null;
  /** Direct réellement en cours (live_sessions.is_live de l'enseignante connectée), sinon null. */
  direct: { titre: string } | null;
  serviceEmail: boolean;
}) {
  const [panneau, setPanneau] = useState<Panneau>(null);
  const choisi = niveaux.find((n) => n.code === niveau) ?? null;
  const horsEspace = niveau !== null && !choisi;
  const elevesDuNiveau = useMemo(() => (niveau ? eleves.filter((e) => e.niveaux.includes(niveau)) : eleves), [eleves, niveau]);
  const basculer = (p: Exclude<Panneau, null>) => setPanneau((x) => (x === p ? null : p));
  const puce = (actif: boolean) => `rounded-full border px-3 py-1.5 text-xs font-semibold transition ${actif ? "bg-[#5B16F9] border-[#5B16F9] text-white shadow-sm" : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"}`;

  return (
    <section aria-labelledby="titre-commande" className="mb-6 rounded-3xl border border-gray-100 bg-white p-3 sm:p-4 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mb-3">
        <h2 id="titre-commande" className="font-playfair text-xl font-bold text-gray-900">Espace de commande de l&apos;enseignante</h2>
        <div className="flex flex-wrap items-center gap-1.5 sm:ms-auto" role="group" aria-label="Niveau visé par les actions collectives">
          <span className="text-xs text-gray-500 me-1">Niveau visé :</span>
          {niveaux.map((n) => (
            <button key={n.id} type="button" className={puce(niveau === n.code)} aria-pressed={niveau === n.code} title={n.titre} onClick={() => changerNiveau(niveau === n.code ? null : n.code)}>{n.code}</button>
          ))}
          {niveaux.length === 0 ? <span className="text-xs text-amber-700">Aucun cours de niveau ne vous est attribué.</span> : null}
        </div>
      </div>
      {horsEspace ? <p className="mb-3 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-900">Le niveau {niveau} ne fait pas partie de vos cours : les actions collectives ne peuvent pas le viser.</p> : null}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-2.5">
        <Tuile icone={CalendarPlus} titre="Programmer un live" ton="from-[#5B16F9] to-[#3a0fb0] text-white"
          href={`${base}/lives/nouveau${choisi ? `?niveau=${choisi.code}` : ""}`}
          sous={choisi ? `Formulaire pré-rempli : ${choisi.code}` : "Ouvre la programmation"} />
        {direct ? (
          <Tuile icone={Radio} titre="En direct maintenant" ton="from-red-500 to-red-600 text-white" href="/formateur/sessions#direct"
            sous={<><span className="inline-block w-2 h-2 rounded-full bg-white animate-pulse me-1 align-middle" aria-hidden />« {direct.titre} » — gérer / arrêter</>} />
        ) : (
          <Tuile icone={Radio} titre="Passer en live" ton="from-red-500 to-red-600 text-white" href="/formateur/sessions#direct"
            sous="Prérequis : lien d'un direct YouTube, Facebook, TikTok ou Instagram" />
        )}
        <Tuile icone={MessageCircle} titre="Message individuel" ton="from-white to-gray-50 text-gray-800" actif={panneau === "message"} onClick={() => basculer("message")}
          sous="Messagerie du site, pré-remplie" />
        <Tuile icone={Megaphone} titre="Annonce de classe" ton="from-orange-500 to-orange-600 text-white" actif={panneau === "annonce"} onClick={() => basculer("annonce")}
          sous={choisi ? `Élèves du ${choisi.code}, après aperçu` : "Choisir un niveau"} />
        <Tuile icone={Mail} titre="Envoyer un e-mail" ton="from-white to-gray-50 text-gray-800" large actif={panneau === "email"} onClick={() => basculer("email")}
          sous={serviceEmail ? "Après vérification et confirmation" : <span className="text-amber-700 font-semibold">Service e-mail non configuré</span>} />
      </div>

      {panneau ? (
        <div className="mt-3 rounded-2xl border border-gray-100 bg-gray-50/60 p-3 sm:p-4">
          {panneau === "message" ? <PanneauMessage base={base} eleves={elevesDuNiveau} /> : null}
          {panneau === "annonce" ? <PanneauAnnonce key={choisi?.id ?? "aucun"} niveau={choisi} serviceEmail={serviceEmail} /> : null}
          {panneau === "email" ? <PanneauEmail base={base} niveau={choisi} eleves={elevesDuNiveau} groupes={groupes} groupeCourant={groupeCourant} serviceEmail={serviceEmail} /> : null}
        </div>
      ) : null}
    </section>
  );
}
