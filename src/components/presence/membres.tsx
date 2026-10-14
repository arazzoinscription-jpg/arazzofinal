"use client";

import { useEffect, useSyncExternalStore } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import {
  AUCUNE, CANAL_MEMBRES, CLE_MON_ACTIVITE, chargeDiffusee, lireMonActivite, membresDepuisPresence,
  type EtatMembre, type MonActivite,
} from "@/lib/presence-membres";

/**
 * Présence des membres — UN seul canal temps réel par onglet, partagé par tous les composants.
 * « En ligne » = le membre a une page Arazzo ouverte en ce moment (et n'est pas en mode discrète).
 * Rien n'est écrit en base ; tant que l'état n'est pas connu, on affiche « … ».
 */

export interface EtatPresenceMembres { pret: boolean; erreur: boolean; membres: Map<string, EtatMembre> }

let etat: EtatPresenceMembres = { pret: false, erreur: false, membres: new Map() };
const ecouteurs = new Set<() => void>();
let client: ReturnType<typeof createClient> | null = null;
let canal: RealtimeChannel | null = null;
let cleCanal: string | null = null;
let moi: string | null = null;
let mienne: MonActivite = AUCUNE;
let utilisateurs = 0;
let fermeture: number | null = null;

function publier(n: Partial<EtatPresenceMembres>) {
  etat = { ...etat, ...n };
  ecouteurs.forEach((f) => f());
}

async function diffuser() {
  if (!canal || !moi || !etat.pret) return;
  const charge = chargeDiffusee(mienne);
  try {
    if (charge) await canal.track(charge);
    else await canal.untrack();
  } catch { /* le temps réel reprendra à la prochaine synchronisation */ }
}

function fermer() {
  if (!canal) return;
  const c = canal;
  canal = null; cleCanal = null;
  void c.untrack().catch(() => undefined);
  void client?.removeChannel(c);
  publier({ pret: false, membres: new Map() });
}

function ouvrir() {
  const cle = moi ?? `visiteur-${Math.random().toString(36).slice(2)}`;
  if (canal && (cleCanal === cle || (!moi && cleCanal?.startsWith("visiteur-")))) return;
  fermer();
  client = client ?? createClient();
  const c = client.channel(CANAL_MEMBRES, { config: { presence: { key: cle, enabled: true } } });
  canal = c; cleCanal = cle;
  c.on("presence", { event: "sync" }, () => {
    if (canal !== c) return;
    publier({ membres: membresDepuisPresence(c.presenceState() as Record<string, unknown[]>) });
  }).subscribe((statut) => {
    if (canal !== c) return;
    if (statut === "SUBSCRIBED") { publier({ pret: true, erreur: false }); void diffuser(); }
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
  // Petit délai : en passant d'une page à l'autre, le canal n'est pas fermé puis rouvert.
  if (utilisateurs === 0 && fermeture === null) fermeture = window.setTimeout(() => { fermeture = null; if (utilisateurs === 0) fermer(); }, 4000);
}

const abonner = (f: () => void) => { ecouteurs.add(f); return () => { ecouteurs.delete(f); }; };
const lire = () => etat;
const VIDE: EtatPresenceMembres = { pret: false, erreur: false, membres: new Map() };

/** Relit MON activité sur cet appareil. */
export function lireMienne(): MonActivite {
  try { return lireMonActivite(localStorage.getItem(CLE_MON_ACTIVITE), Date.now()); } catch { return AUCUNE; }
}

/** Change MON activité (ou ma discrétion) : gardée sur l'appareil, diffusée aussitôt. */
export function changerMienne(a: MonActivite) {
  mienne = a;
  try { localStorage.setItem(CLE_MON_ACTIVITE, JSON.stringify(a)); } catch { /* stockage indisponible : diffusé pour cette visite seulement */ }
  void diffuser();
  window.dispatchEvent(new CustomEvent("arazzo:mon-activite"));
}

/** À monter dans les espaces des membres connectés : signale « en ligne » + l'activité choisie. */
export function SignalPresenceMembre({ userId }: { userId: string }) {
  useEffect(() => {
    moi = userId.toLowerCase();
    mienne = lireMienne();
    retenir();
    void diffuser();
    return () => { relacher(); };
  }, [userId]);
  return null;
}

/** État de présence de tous les membres (un seul canal pour toute la page). */
export function useMembresEnLigne(actif = true): EtatPresenceMembres {
  useEffect(() => {
    if (!actif) return;
    retenir();
    return () => relacher();
  }, [actif]);
  const e = useSyncExternalStore(abonner, lire, () => VIDE);
  return actif ? e : VIDE;
}

export type EtatEnLigne = "connexion" | "en_ligne" | "hors_ligne" | "indisponible";

export function etatDe(p: EtatPresenceMembres, id: string): { etat: EtatEnLigne; membre: EtatMembre | null } {
  if (p.erreur) return { etat: "indisponible", membre: null };
  if (!p.pret) return { etat: "connexion", membre: null };
  const m = p.membres.get(id.toLowerCase()) ?? null;
  return { etat: m ? "en_ligne" : "hors_ligne", membre: m };
}
