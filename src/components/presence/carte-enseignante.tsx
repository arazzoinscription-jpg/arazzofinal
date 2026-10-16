"use client";

import Link from "next/link";
import { MessageCircle, UserRound } from "lucide-react";
import { ouvrirMessagerie } from "@/lib/classe/ouvrir-messagerie";
import { useEnseignantesEnLigne, type EtatPresence } from "./presence";
import { etatDe, useMembresEnLigne } from "./membres";
import { PiluleEnLigne } from "./activite";

/** En ligne si l'un des deux signaux le dit (espace enseignante ouvert, ou n'importe quelle page Arazzo). */
function etatCombine(enseignante: EtatPresence, membre: EtatPresence): EtatPresence {
  if (enseignante === "en_ligne" || membre === "en_ligne") return "en_ligne";
  if (enseignante === "hors_ligne" || membre === "hors_ligne") return "hors_ligne";
  if (enseignante === "connexion" || membre === "connexion") return "connexion";
  return "indisponible";
}

/**
 * La carte de l'enseignante dans le lecteur de cours : photo, nom, en ligne / déconnectée (temps réel),
 * son profil et « Contacter » (messagerie du site — l'élève écrit et envoie elle-même).
 */
export function CarteEnseignante({ enseignante, compacte = false }: {
  enseignante: { id: string; nom: string; avatar: string | null };
  /** Version en ligne (téléphone) ; sinon carte carrée (colonne du programme). */
  compacte?: boolean;
}) {
  const presenceEnseignantes = useEnseignantesEnLigne();
  const membres = useMembresEnLigne();
  const etat = etatCombine(presenceEnseignantes(enseignante.id), etatDe(membres, enseignante.id).etat);
  const enLigne = etat === "en_ligne";
  const initiales = enseignante.nom.replace(/\(.*?\)/g, " ").trim().split(/\s+/).filter(Boolean).map((m) => m[0]).slice(0, 2).join("").toUpperCase() || "?";

  const photo = (taille: string) => (
    <span className={`relative flex-shrink-0 ${taille}`}>
      <span className="block w-full h-full rounded-2xl overflow-hidden bg-gradient-to-br from-[#5B16F9] to-[#2A0880] text-white font-playfair font-bold flex items-center justify-center">
        {enseignante.avatar
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={enseignante.avatar} alt={`Photo de ${enseignante.nom}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          : <span className="text-xl">{initiales}</span>}
      </span>
      <span className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full ring-2 ring-white ${enLigne ? "bg-emerald-500 animate-pulse" : "bg-gray-300"}`} aria-hidden />
    </span>
  );

  const boutons = (
    <div className={`flex gap-2 ${compacte ? "flex-col" : "w-full"}`}>
      <Link href={`/communaute/u/${enseignante.id}`} className={`inline-flex items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white text-gray-800 text-xs font-semibold px-3 py-2 hover:bg-gray-50 ${compacte ? "" : "flex-1"}`}>
        <UserRound size={14} aria-hidden /> Profil
      </Link>
      <button type="button" onClick={() => ouvrirMessagerie({ id: enseignante.id, nom: enseignante.nom })}
        className={`inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#5B16F9] text-white text-xs font-semibold px-3 py-2 hover:bg-[#4a10d0] ${compacte ? "" : "flex-1"}`}>
        <MessageCircle size={14} aria-hidden /> Contacter
      </button>
    </div>
  );

  if (compacte) {
    return (
      <section aria-label="Votre enseignante" className="mb-4 flex items-center gap-3 rounded-2xl border border-violet-100 bg-white p-3 shadow-sm">
        {photo("w-14 h-14")}
        <div className="min-w-0 flex-1">
          <p className="text-[11px] text-gray-500">Votre enseignante</p>
          <p className="font-semibold text-gray-900 truncate">{enseignante.nom}</p>
          <div className="mt-1"><PiluleEnLigne etat={etat} /></div>
        </div>
        {boutons}
      </section>
    );
  }

  return (
    <section aria-label="Votre enseignante" className="rounded-2xl border border-violet-100 bg-white p-4 shadow-sm flex flex-col items-center text-center gap-2">
      <p className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold self-start">Votre enseignante</p>
      {photo("w-24 h-24")}
      <p className="font-playfair text-lg font-bold text-gray-900 leading-tight">{enseignante.nom}</p>
      <PiluleEnLigne etat={etat} />
      {boutons}
    </section>
  );
}
