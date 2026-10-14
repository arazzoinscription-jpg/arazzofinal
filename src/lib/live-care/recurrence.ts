/**
 * Lives pédagogiques — occurrences d'un live unique ou hebdomadaire.
 *
 * Une série hebdomadaire n'est PAS un second calendrier : chaque occurrence est
 * une ligne de `live_sessions` (la table que lisent déjà les pages élève et
 * formatrice), reliée à sa série par `series_id` + `occurrence_date` (unique :
 * une même date ne peut pas être créée deux fois, même en cas de double clic).
 *
 * Module PUR.
 */

import { ajouterJours, ecartJours, estHeureValide, estJourValide, instantAlger } from "./temps";

/** Une série couvre au plus 26 semaines (6 mois) : au-delà, on la prolonge plus tard. */
export const SEMAINES_MAX = 26;

export interface Occurrence {
  occurrence_date: string; // AAAA-MM-JJ (jour d'Alger)
  starts_at: string;       // instant ISO UTC
}

export interface RegleHebdo {
  /** Première date ; elle fixe le jour de la semaine. */
  dateDebut: string;
  /** Dernière date possible (incluse). */
  dateFin: string;
  /** Heure d'Alger « HH:MM ». */
  heure: string;
}

export class ErreurRecurrence extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ErreurRecurrence";
  }
}

export function occurrenceUnique(jour: string, heure: string): Occurrence {
  return { occurrence_date: jour, starts_at: instantAlger(jour, heure) };
}

/** Toutes les occurrences hebdomadaires, de dateDebut à dateFin incluse. */
export function occurrencesHebdo({ dateDebut, dateFin, heure }: RegleHebdo): Occurrence[] {
  if (!estJourValide(dateDebut) || !estJourValide(dateFin)) throw new ErreurRecurrence("Dates de la série invalides.");
  if (!estHeureValide(heure)) throw new ErreurRecurrence("Heure invalide.");
  const ecart = ecartJours(dateDebut, dateFin);
  if (ecart < 0) throw new ErreurRecurrence("La date de fin précède la date de début.");
  if (ecart > SEMAINES_MAX * 7) throw new ErreurRecurrence(`Une série couvre au plus ${SEMAINES_MAX} semaines.`);
  const out: Occurrence[] = [];
  for (let jour = dateDebut; jour <= dateFin; jour = ajouterJours(jour, 7)) {
    out.push({ occurrence_date: jour, starts_at: instantAlger(jour, heure) });
  }
  return out;
}

export interface OccurrenceExistante {
  id: string;
  occurrence_date: string;
  starts_at: string;
  cancelled_at: string | null;
  /** Modifiée à la main : une modification de la série ne l'écrase pas. */
  occurrence_modifiee: boolean;
}

export interface PlanSerie {
  /** Dates voulues qui n'existent pas encore (futures uniquement). */
  aCreer: Occurrence[];
  /** Occurrences futures, actives, non modifiées à la main, à aligner sur la série. */
  aMettreAJour: { id: string; occurrence: Occurrence }[];
  /** Occurrences futures actives qui ne font plus partie de la série. */
  aAnnuler: string[];
  /** Occurrences annulées à la main : jamais recréées en silence. */
  annuleesConservees: string[];
  /** Modifiées à la main : laissées telles quelles. */
  modifieesConservees: string[];
  /** Passées : l'historique n'est jamais réécrit. */
  passees: string[];
  /**
   * Dates de l'ANCIENNE règle dont la ligne a disparu (supprimée hors du module : bouton
   * de la formatrice, SQL…) : la suppression est respectée, la date n'est pas recréée.
   */
  supprimeesRespectees: string[];
}

/**
 * Ce qu'il faut faire pour qu'une série existante corresponde à sa nouvelle règle.
 * Règles : le passé ne bouge pas ; une annulation, une modification ou une
 * suppression manuelle est respectée ; une date n'est jamais créée deux fois.
 */
export function planSerie(
  existantes: OccurrenceExistante[],
  voulues: Occurrence[],
  maintenant: Date,
  /** Dates de la règle AVANT modification. Absente : toute date manquante est (re)créée. */
  anciennesDates?: ReadonlySet<string>,
): PlanSerie {
  const now = maintenant.getTime();
  const futur = (iso: string) => new Date(iso).getTime() > now;
  const parDate = new Map(existantes.map((e) => [e.occurrence_date, e]));
  const voulueParDate = new Map(voulues.map((v) => [v.occurrence_date, v]));
  const plan: PlanSerie = { aCreer: [], aMettreAJour: [], aAnnuler: [], annuleesConservees: [], modifieesConservees: [], passees: [], supprimeesRespectees: [] };

  for (const e of existantes) {
    if (!futur(e.starts_at)) { plan.passees.push(e.id); continue; }
    if (e.cancelled_at) { plan.annuleesConservees.push(e.id); continue; }
    const v = voulueParDate.get(e.occurrence_date);
    if (!v) { plan.aAnnuler.push(e.id); continue; }
    if (e.occurrence_modifiee) { plan.modifieesConservees.push(e.id); continue; }
    plan.aMettreAJour.push({ id: e.id, occurrence: v });
  }
  for (const v of voulues) {
    if (parDate.has(v.occurrence_date) || !futur(v.starts_at)) continue;
    if (anciennesDates?.has(v.occurrence_date)) { plan.supprimeesRespectees.push(v.occurrence_date); continue; }
    plan.aCreer.push(v);
  }
  return plan;
}
