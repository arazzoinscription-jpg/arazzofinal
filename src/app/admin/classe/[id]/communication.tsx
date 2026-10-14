"use client";

import { useState } from "react";
import { Copy, Mail, MessageCircle, Phone, Send } from "lucide-react";
import { lienMailto, lienWhatsApp } from "@/lib/classe/communication";
import { ouvrirMessagerie } from "../commandes";
import { EnvoiEmail } from "../envoi-email";

/**
 * Communication individuelle :
 *  - messagerie du site : la conversation s'ouvre avec le texte pré-rempli, l'enseignante envoie ;
 *  - WhatsApp / e-mail : l'application de l'enseignante s'ouvre avec un brouillon ;
 *  - e-mail envoyé PAR LE SITE : vérification puis confirmation explicite (le serveur revérifie tout).
 */
export function Communication({ base, eleve, modele, serviceEmail }: {
  base: string;
  eleve: { id: string; nom: string; email: string | null; telephone: string | null; telephoneSource: string | null };
  modele: { sujet: string; corps: string };
  serviceEmail: boolean;
}) {
  const [sujet, setSujet] = useState(modele.sujet);
  const [texte, setTexte] = useState(modele.corps);
  const [copie, setCopie] = useState(false);
  const wa = lienWhatsApp(eleve.telephone, texte);
  const mail = lienMailto(eleve.email, sujet, texte);
  const bouton = "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition";

  async function copier() {
    try { await navigator.clipboard.writeText(texte); setCopie(true); setTimeout(() => setCopie(false), 2000); } catch { setCopie(false); }
  }

  return (
    <section id="communication" className="mt-4 bg-white rounded-2xl border border-gray-100 p-5 scroll-mt-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
        <h2 className="font-semibold text-gray-900 font-dm">Communiquer avec l&apos;élève</h2>
        <span className="text-xs rounded-full bg-gray-100 text-gray-600 px-2.5 py-1">Rien ne part sans votre confirmation</span>
      </div>
      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
        <div className="space-y-2">
          <label className="block text-xs text-gray-500">Objet (pour l&apos;e-mail)
            <input value={sujet} onChange={(e) => setSujet(e.target.value)} className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400/40" />
          </label>
          <label className="block text-xs text-gray-500">Message — brouillon proposé d&apos;après le suivi, à relire et adapter
            <textarea value={texte} onChange={(e) => setTexte(e.target.value)} rows={8} className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-orange-400/40" />
          </label>
        </div>
        <div className="flex flex-col gap-2">
          <button type="button" onClick={() => ouvrirMessagerie({ id: eleve.id, nom: eleve.nom, texte })} className={`${bouton} bg-[#5B16F9] text-white hover:bg-[#4a10d0]`}>
            <MessageCircle size={16} /> Message interne du site
          </button>
          <p className="text-[11px] text-gray-500 -mt-1 mb-1">Ouvre la conversation avec le texte : vous envoyez vous-même.</p>

          {wa ? (
            <a href={wa} target="_blank" rel="noopener noreferrer" className={`${bouton} bg-emerald-600 text-white hover:bg-emerald-700`}><Phone size={16} /> Préparer dans WhatsApp</a>
          ) : (
            <span className={`${bouton} bg-gray-100 text-gray-400 cursor-not-allowed`} aria-disabled><Phone size={16} /> WhatsApp : numéro inconnu</span>
          )}
          <p className="text-[11px] text-gray-500 -mt-1 mb-1">{wa ? `Ouvre WhatsApp (numéro : ${eleve.telephoneSource ?? "source inconnue"}).` : "Le profil LMS n'a pas de téléphone ; aucun numéro trouvé dans les commandes."}</p>

          {mail ? (
            <a href={mail} className={`${bouton} bg-white border border-gray-200 text-gray-800 hover:bg-gray-50`}><Mail size={16} /> Préparer l&apos;e-mail (ma messagerie)</a>
          ) : (
            <span className={`${bouton} bg-gray-100 text-gray-400 cursor-not-allowed`} aria-disabled><Mail size={16} /> E-mail : adresse inconnue</span>
          )}
          <button type="button" onClick={copier} className={`${bouton} bg-white border border-gray-200 text-gray-700 hover:bg-gray-50`}>
            <Copy size={16} /> {copie ? "Texte copié" : "Copier le texte"}
          </button>
        </div>
      </div>
      <details className="mt-4 rounded-xl border border-gray-100 bg-gray-50/60 p-3">
        <summary className="cursor-pointer list-none flex items-center gap-2 text-sm font-semibold text-gray-800">
          <Send size={16} aria-hidden /> Envoyer cet e-mail depuis le site
          <span className={`ms-auto text-[11px] font-semibold ${serviceEmail ? "text-gray-500" : "text-amber-700"}`}>{serviceEmail ? "vérification + confirmation" : "service e-mail non configuré"}</span>
        </summary>
        <div className="mt-3">
          <EnvoiEmail base={base} cible={{ type: "eleve", id: eleve.id }} libelleCible={eleve.nom} message={{ sujet, corps: texte }} serviceEmail={serviceEmail} />
        </div>
      </details>
    </section>
  );
}
