/**
 * Lives pédagogiques — ce qu'on peut affirmer pour UNE élève et UN live.
 *
 *  - invitation prévue   : au moins un rappel « prévu » à venir qui la concerne ;
 *  - invitation envoyée  : SEULEMENT si un envoi est confirmé — rappel « envoyé »
 *                          confirmé, ou trace réelle du système existant (notification
 *                          « session » enregistrée, e-mail journalisé « sent ») ;
 *  - présence confirmée  : le LMS n'a aucune confirmation de présence → indisponible ;
 *  - présence réelle     : le LMS ne suit pas la présence aux lives → non enregistrée.
 *
 * Module PUR.
 */

import type { Cellule } from "../student-care/display";
import { CANAUX, etatRappel, type Canal, type StatutRappel } from "./rappels";
import { dateLongue, heureCourte } from "./temps";

export interface RappelPourStatut {
  canal: Canal;
  statut: StatutRappel;
  prevu_le: string;
  envoye_le: string | null;
  fournisseur_id: string | null;
}

export interface PreuveExistante {
  /** Notification « session » insérée par le cron existant pour ce live (preuve d'insertion, pas de lecture). */
  notification_le: string | null;
  /** E-mail « Annonces » journalisé pour ce live par le cron existant. */
  email_le: string | null;
  email_statut: "sent" | "failed" | "skipped" | null;
}

const quand = (iso: string) => `${dateLongue(iso)} à ${heureCourte(iso)}`;

export function celluleInvitationPrevue(rappels: RappelPourStatut[], emailAutorise: boolean | null, maintenant: Date): Cellule {
  const avenir = rappels.filter((r) => etatRappel(r, maintenant).code === "prevu");
  if (avenir.length === 0) return { etat: "aucune", texte: "Aucun rappel prévu" };
  const bloque = emailAutorise === false && avenir.some((r) => r.canal === "email");
  // Désinscrite des e-mails « Annonces » : les rappels e-mail ne la concernent pas — on le dit dans le texte visible.
  const utiles = bloque ? avenir.filter((r) => r.canal !== "email") : avenir;
  const canaux = [...new Set(utiles.map((r) => r.canal))];
  const exclu = bloque ? " (e-mail exclu : désinscrite des Annonces)" : "";
  if (utiles.length === 0) return { etat: "aucune", texte: `Aucun rappel ne lui parviendrait${exclu}`, detail: "Elle s'est désinscrite des e-mails « Annonces » : le rappel e-mail ne lui parviendrait pas." };
  return {
    etat: "valeur",
    texte: `${utiles.length} rappel(s) prévu(s) — ${canaux.map((c) => CANAUX[c].libelle).join(", ")}${exclu}`,
    detail: bloque
      ? "Elle s'est désinscrite des e-mails « Annonces » : le rappel e-mail ne lui parviendrait pas."
      : "Planifié seulement : aucun moteur d'envoi n'est actif dans cette phase.",
  };
}

export function celluleInvitationEnvoyee(rappels: RappelPourStatut[], preuve: PreuveExistante | null, maintenant: Date): Cellule {
  const confirmes = rappels.filter((r) => etatRappel(r, maintenant).code === "envoye");
  const traces: string[] = [];
  if (confirmes.length) traces.push(`${confirmes.length} rappel(s) confirmé(s)`);
  if (preuve?.notification_le) traces.push(`notification interne enregistrée le ${quand(preuve.notification_le)} (système existant)`);
  if (preuve?.email_le && preuve.email_statut === "sent") traces.push(`e-mail journalisé « envoyé » le ${quand(preuve.email_le)} (système existant)`);
  if (traces.length) {
    return { etat: "valeur", texte: traces.join(" · "), detail: "Une notification enregistrée n'est pas une preuve de lecture." };
  }
  if (preuve?.email_le && preuve.email_statut && preuve.email_statut !== "sent") {
    return { etat: "aucune", texte: `E-mail non parti (${preuve.email_statut === "skipped" ? "désinscription / réglage" : "échec"})` };
  }
  return { etat: "aucune", texte: "Aucun envoi confirmé" };
}

export type StatutLive = "a_venir" | "en_cours" | "passe" | "annule";

export const LIBELLE_STATUT_LIVE: Record<StatutLive, string> = {
  a_venir: "À venir", en_cours: "En cours", passe: "Passé", annule: "Annulé",
};

/** Statut d'un live à un instant donné (durée par défaut : 60 min). */
export function statutLive(l: { starts_at: string; duree_minutes: number | null; cancelled_at: string | null }, maintenant: Date): StatutLive {
  if (l.cancelled_at) return "annule";
  const debut = new Date(l.starts_at).getTime();
  const fin = debut + (l.duree_minutes ?? 60) * 60_000;
  const now = maintenant.getTime();
  if (now < debut) return "a_venir";
  return now <= fin ? "en_cours" : "passe";
}

export const CELLULE_PRESENCE_CONFIRMEE: Cellule = {
  etat: "indisponible",
  texte: "Non disponible",
  detail: "Le LMS n'enregistre aucune confirmation de participation aux lives.",
};

export const CELLULE_PRESENCE_REELLE: Cellule = {
  etat: "non_enregistree",
  texte: "Non suivie",
  detail: "Le LMS ne suit pas la présence réelle aux lives (aucun pointage, aucune donnée YouTube/Meet).",
};
