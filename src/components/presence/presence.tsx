"use client";

import { useEffect, useSyncExternalStore } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

/**
 * Présence « en ligne » des enseignantes — Supabase Realtime Presence (temps réel, AUCUNE écriture en base).
 *  - L'enseignante (espace formatrice ou administration ouvert) SIGNALE sa présence ;
 *  - l'élève (« Ma classe », lecteur de cours) ÉCOUTE seulement : sa présence n'est pas diffusée sur ce canal.
 * « En ligne » = l'enseignante a son espace Arazzo ouvert en ce moment. Rien n'est inventé :
 * tant que l'état n'est pas connu, on affiche « … », et « indisponible » si le temps réel échoue.
 *
 * UN SEUL canal par onglet, partagé par tous les composants : le client temps réel réutilise le canal
 * d'un même sujet, et ajouter une écoute après son abonnement fait planter la page (deux cartes
 * « enseignante » sur la même page, par exemple).
 */
export const CANAL_PRESENCE = "arazzo-enseignantes-en-ligne";

export type EtatPresence = "connexion" | "en_ligne" | "hors_ligne" | "indisponible";

interface Etat { pret: boolean; erreur: boolean; enLigne: Set<string> }
let etat: Etat = { pret: false, erreur: false, enLigne: new Set() };
const ecouteurs = new Set<() => void>();
let client: ReturnType<typeof createClient> | null = null;
let canal: RealtimeChannel | null = null;
let cleCanal: string | null = null;
/** L'enseignante connectée sur cet onglet (si elle signale sa présence). */
let moi: string | null = null;
let utilisateurs = 0;
let fermeture: number | null = null;

function publier(n: Partial<Etat>) {
  etat = { ...etat, ...n };
  ecouteurs.forEach((f) => f());
}

function fermer() {
  if (!canal) return;
  const c = canal;
  canal = null; cleCanal = null;
  void c.untrack().catch(() => undefined);
  void client?.removeChannel(c);
  publier({ pret: false, enLigne: new Set() });
}

function ouvrir() {
  const cle = moi ?? `ecoute-${Math.random().toString(36).slice(2)}`;
  if (canal && (cleCanal === cle || (!moi && cleCanal?.startsWith("ecoute-")))) return;
  fermer();
  client = client ?? createClient();
  const c = client.channel(CANAL_PRESENCE, { config: { presence: { key: cle, enabled: true } } });
  canal = c; cleCanal = cle;
  c.on("presence", { event: "sync" }, () => {
    if (canal !== c) return;
    // Seules les enseignantes « signalent » : les clés présentes sont leurs identifiants.
    publier({ enLigne: new Set(Object.keys(c.presenceState())) });
  }).subscribe(async (statut) => {
    if (canal !== c) return;
    if (statut === "SUBSCRIBED") {
      publier({ pret: true, erreur: false });
      if (moi) { try { await c.track({ en_ligne_depuis: new Date().toISOString() }); } catch { /* reprendra */ } }
    }
    if (statut === "CHANNEL_ERROR" || statut === "TIMED_OUT") publier({ erreur: true });
  });
}

function retenir() {
  utilisateurs += 1;
  if (fermeture !== null) { window.clearTimeout(fermeture); fermeture = null; }
  ouvrir();
}

function relacher() {
  utilisateurs = Math.max(0, utilisateurs - 1);
  if (utilisateurs === 0 && fermeture === null) fermeture = window.setTimeout(() => { fermeture = null; if (utilisateurs === 0) fermer(); }, 4000);
}

const abonner = (f: () => void) => { ecouteurs.add(f); return () => { ecouteurs.delete(f); }; };
const lire = () => etat;
const VIDE: Etat = { pret: false, erreur: false, enLigne: new Set() };

/** Côté enseignante : à monter dans les espaces formatrice et administration. */
export function SignalPresence({ userId }: { userId: string }) {
  useEffect(() => {
    moi = userId;
    retenir();
    return () => { moi = null; relacher(); };
  }, [userId]);
  return null;
}

/** Côté élève : renvoie l'état de présence d'une enseignante (par identifiant). */
export function useEnseignantesEnLigne(): (id: string) => EtatPresence {
  useEffect(() => {
    retenir();
    return () => relacher();
  }, []);
  const e = useSyncExternalStore(abonner, lire, () => VIDE);
  return (id: string) => (e.erreur ? "indisponible" : !e.pret ? "connexion" : e.enLigne.has(id) ? "en_ligne" : "hors_ligne");
}

const STYLE: Record<EtatPresence, { texte: string; classe: string; point: string }> = {
  en_ligne: { texte: "En ligne", classe: "bg-emerald-50 text-emerald-700 border-emerald-200", point: "bg-emerald-500 animate-pulse" },
  hors_ligne: { texte: "Hors ligne", classe: "bg-gray-50 text-gray-500 border-gray-200", point: "bg-gray-300" },
  connexion: { texte: "…", classe: "bg-gray-50 text-gray-400 border-gray-100", point: "bg-gray-200" },
  indisponible: { texte: "Présence indisponible", classe: "bg-amber-50 text-amber-700 border-amber-200", point: "bg-amber-300" },
};

export function PastillePresence({ etat }: { etat: EtatPresence }) {
  const s = STYLE[etat];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${s.classe}`} title="En ligne = l'enseignante a son espace Arazzo ouvert en ce moment.">
      <span className={`w-2 h-2 rounded-full ${s.point}`} aria-hidden />{s.texte}
    </span>
  );
}
