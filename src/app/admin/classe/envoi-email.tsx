"use client";

import { useEffect, useRef, useState } from "react";
import { MailCheck, Send, Users } from "lucide-react";
import type { CibleCommande, EtapeEnvoi } from "@/lib/classe/commande";
import { apercuEmailAction, envoyerEmailAction, type ReponseApercu } from "./commande-actions";
import { Etapes } from "./etapes";

/**
 * E-mail envoyé PAR LE SITE (service e-mail existant), en deux temps :
 *  1. « Vérifier les destinataires » — nombre, désinscriptions, adresses manquantes (jamais les adresses) ;
 *  2. case de confirmation, puis « Envoyer ». Le serveur revérifie tout et refuse sans service configuré.
 */
export function EnvoiEmail({ base, cible, libelleCible, message, serviceEmail }: {
  base: string;
  cible: CibleCommande | null;
  libelleCible: string;
  /** Objet + texte saisis AILLEURS (fiche élève) : pas de champs propres, on envoie exactement ce texte. */
  message?: { sujet: string; corps: string };
  serviceEmail: boolean;
}) {
  const [sujetPropre, setSujet] = useState("");
  const [corpsPropre, setCorps] = useState("");
  const sujet = message ? message.sujet : sujetPropre;
  const corps = message ? message.corps : corpsPropre;
  const [apercu, setApercu] = useState<ReponseApercu | null>(null);
  const [confirme, setConfirme] = useState(false);
  const [etape, setEtape] = useState<EtapeEnvoi | null>(null);
  const [detail, setDetail] = useState<string | null>(null);
  const [lecture, setLecture] = useState(false);
  const enCours = useRef(false);
  const cleCible = cible ? JSON.stringify(cible) : "";

  // Toute modification annule l'aperçu et la confirmation : on reconfirme ce qui part vraiment.
  useEffect(() => { setApercu(null); setConfirme(false); if (!enCours.current) { setEtape(null); setDetail(null); } }, [cleCible, sujet, corps]);

  async function verifier() {
    if (!cible) return;
    setLecture(true);
    const r = await apercuEmailAction({ base, cible });
    setLecture(false);
    setApercu(r);
    setConfirme(false);
    if (r.ok) { setEtape("prepare"); setDetail(`${r.resume.envoyables} e-mail(s) seront tentés si vous confirmez.`); }
  }

  async function envoyer() {
    if (enCours.current || !cible) return;
    enCours.current = true;
    setEtape("declenche"); setDetail(null);
    try {
      const r = await envoyerEmailAction({ base, cible, sujet, corps, confirmation: confirme });
      setEtape(r.etape);
      setDetail(r.ok ? r.message : r.erreur);
    } catch {
      setEtape("echec"); setDetail("Pas de réponse du serveur : vérifiez le journal des e-mails avant de renvoyer.");
    } finally {
      enCours.current = false;
      setConfirme(false);
    }
  }

  const r = apercu?.ok ? apercu : null;
  const peutEnvoyer = Boolean(r && r.serviceConfigure && r.resume.envoyables > 0 && r.resume.envoyables <= r.limite && confirme && etape !== "declenche");
  const champ = "mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#5B16F9]/30";

  return (
    <div className="space-y-3">
      {!serviceEmail ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-900">
          <b>Bloqué par un prérequis :</b> le service e-mail (Resend) n&apos;est pas configuré sur ce serveur. Vous pouvez préparer et vérifier,
          mais aucun e-mail ne peut partir — le serveur refuse l&apos;envoi sans même contacter le fournisseur.
        </div>
      ) : null}
      {message ? null : (
        <>
          <label className="block text-xs text-gray-500">Objet
            <input value={sujet} onChange={(e) => setSujet(e.target.value)} maxLength={150} className={champ} placeholder="Ex. : Rappel — atelier de samedi" />
          </label>
          <label className="block text-xs text-gray-500">Message (texte simple, les retours à la ligne sont gardés)
            <textarea value={corps} onChange={(e) => setCorps(e.target.value)} rows={6} maxLength={5000} className={`${champ} leading-relaxed`} placeholder="Bonjour…" />
          </label>
        </>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={verifier} disabled={!cible || lecture}
          className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50 disabled:opacity-50">
          <Users size={16} aria-hidden /> {lecture ? "Lecture…" : "1. Vérifier les destinataires"}
        </button>
        <span className="text-xs text-gray-500">{cible ? <>Destinataire : <b>{libelleCible}</b></> : "Choisissez d'abord un destinataire."}</span>
      </div>

      {apercu && !apercu.ok ? <p className="rounded-xl bg-red-50 border border-red-100 px-3 py-2 text-sm text-red-700">{apercu.erreur}</p> : null}
      {r ? (
        <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-700 space-y-1">
          <div><b>{r.resume.envoyables}</b> e-mail(s) possible(s) sur {r.resume.total} élève(s){r.resume.apercuNoms.length ? <> — {r.resume.apercuNoms.join(", ")}{r.resume.total > r.resume.apercuNoms.length ? "…" : ""}</> : null}</div>
          {r.resume.desinscrites ? <div className="text-xs text-gray-500">{r.resume.desinscrites} désinscrite(s) de ces e-mails : ignorée(s).</div> : null}
          {r.resume.sansEmail ? <div className="text-xs text-gray-500">{r.resume.sansEmail} sans adresse valide : ignorée(s).</div> : null}
          {r.resume.envoyables > r.limite ? <div className="text-xs text-red-700 font-semibold">Au-delà de {r.limite} destinataires : utilisez « Annonce de classe » avec l&apos;option e-mail.</div> : null}
          {r.resume.total === 0 ? <div className="text-xs text-gray-500">Aucune élève de votre espace ne correspond.</div> : null}
          <label className="flex items-start gap-2 pt-1 text-sm">
            <input type="checkbox" checked={confirme} onChange={(e) => setConfirme(e.target.checked)} disabled={!r.serviceConfigure || r.resume.envoyables === 0} className="mt-1" />
            <span>Je confirme l&apos;envoi de <b>{r.resume.envoyables}</b> e-mail(s) avec cet objet et ce message.</span>
          </label>
          <button type="button" onClick={envoyer} disabled={!peutEnvoyer}
            className="inline-flex items-center gap-2 rounded-xl bg-[#5B16F9] px-4 py-2 text-sm font-semibold text-white hover:bg-[#4a10d0] disabled:opacity-40 disabled:cursor-not-allowed">
            {etape === "confirme" ? <MailCheck size={16} aria-hidden /> : <Send size={16} aria-hidden />} 2. Envoyer
          </button>
          {!r.serviceConfigure ? <div className="text-xs text-amber-800">Envoi impossible : service e-mail non configuré.</div> : null}
        </div>
      ) : null}

      <Etapes etape={etape} detail={detail} />
    </div>
  );
}
