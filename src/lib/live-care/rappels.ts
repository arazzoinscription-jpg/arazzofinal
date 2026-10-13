/**
 * Lives pédagogiques — PLANIFICATION des rappels (aucun envoi).
 *
 * Cette phase ne fait que calculer et enregistrer des échéances (`live_reminders`,
 * statut « prevu »). Aucun moteur d'envoi n'existe ici : un rappel n'est affiché
 * « envoyé » QUE si un envoi a été confirmé (statut « envoye » + date + identifiant
 * du fournisseur). Jamais par supposition.
 *
 * Anti-doublon : une seule ligne par (live, moment, décalage, canal) — contrainte
 * unique en base, et `reconcilier` ne propose jamais deux fois la même clé.
 *
 * Module PUR.
 */

export type Moment = "avant" | "debut" | "apres";
export type Canal = "notification" | "email" | "whatsapp";
export type StatutRappel = "prevu" | "annule" | "envoye" | "echec";

export interface RegleRappel {
  moment: Moment;
  /** Minutes AVANT le début (avant) ou APRÈS la fin (apres) ; 0 pour « debut ». */
  decalage_minutes: number;
  canal: Canal;
}

/** Ce que permettent RÉELLEMENT les canaux existants (vérifié dans le code du LMS et de l'OS). */
export const CANAUX: Record<Canal, { libelle: string; disponible: boolean; limite: string }> = {
  notification: {
    libelle: "Notification interne",
    disponible: true,
    limite: "Cloche du site (table notifications) ; le push téléphone dépend du webhook Supabase → /api/webhooks/push (non vérifiable d'ici). Moteur d'envoi non branché dans cette phase.",
  },
  email: {
    libelle: "E-mail",
    disponible: true,
    limite: "Resend, via l'envoi central du LMS : respecte la désinscription de l'élève (catégorie Annonces) et le réglage admin ; quota Resend. Moteur d'envoi non branché dans cette phase.",
  },
  whatsapp: {
    libelle: "WhatsApp",
    disponible: false,
    limite: "Indisponible : le LMS n'envoie aucun WhatsApp par API (liens wa.me seulement) ; l'OS n'a pas de WhatsApp configuré et ne pourrait envoyer que du texte dans la fenêtre de 24 h suivant un message de l'élève.",
  },
};

/** Rappels proposés dans le formulaire. */
export const RAPPELS_PROPOSES: { cle: string; moment: Moment; decalage_minutes: number; libelle: string }[] = [
  { cle: "veille", moment: "avant", decalage_minutes: 1440, libelle: "La veille (24 h avant)" },
  { cle: "heure", moment: "avant", decalage_minutes: 60, libelle: "1 h avant" },
  { cle: "debut", moment: "debut", decalage_minutes: 0, libelle: "Au démarrage" },
  { cle: "apres", moment: "apres", decalage_minutes: 60, libelle: "1 h après la fin (replay)" },
];

export class ErreurRappel extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ErreurRappel";
  }
}

/** Valide une règle (moment connu, décalage borné, canal connu). */
export function validerRegle(r: RegleRappel): RegleRappel {
  if (!["avant", "debut", "apres"].includes(r.moment)) throw new ErreurRappel(`Moment inconnu : ${r.moment}`);
  if (!(r.canal in CANAUX)) throw new ErreurRappel(`Canal inconnu : ${r.canal}`);
  const d = Number(r.decalage_minutes);
  if (!Number.isInteger(d) || d < 0) throw new ErreurRappel("Décalage invalide.");
  if (r.moment === "debut" && d !== 0) throw new ErreurRappel("Le rappel « au démarrage » n'a pas de décalage.");
  if (r.moment === "avant" && (d < 5 || d > 7 * 1440)) throw new ErreurRappel("Un rappel « avant » se place entre 5 min et 7 jours avant.");
  if (r.moment === "apres" && d > 1440) throw new ErreurRappel("Un rappel « après » se place au plus 24 h après la fin.");
  return { moment: r.moment, decalage_minutes: d, canal: r.canal };
}

export const cleRappel = (r: RegleRappel) => `${r.moment}:${r.decalage_minutes}:${r.canal}`;

/** Échéance d'un rappel pour un live. */
export function echeance(r: RegleRappel, startsAt: string, dureeMinutes: number): string {
  const debut = new Date(startsAt).getTime();
  const min = 60_000;
  if (r.moment === "avant") return new Date(debut - r.decalage_minutes * min).toISOString();
  if (r.moment === "debut") return new Date(debut).toISOString();
  return new Date(debut + (Math.max(0, dureeMinutes) + r.decalage_minutes) * min).toISOString();
}

export interface RappelExistant extends RegleRappel {
  id: string;
  statut: StatutRappel;
  prevu_le: string;
}

export interface PlanRappels {
  aCreer: (RegleRappel & { prevu_le: string })[];
  /** Rappels « prévus » dont l'échéance change (heure du live modifiée) ou réactivés. */
  aReplanifier: { id: string; prevu_le: string }[];
  /** Rappels « prévus » à annuler (live annulé, ou rappel retiré). */
  aAnnuler: string[];
  /** Règles écartées, avec la raison (canal indisponible, échéance passée…). */
  ecartes: { regle: RegleRappel; raison: string }[];
}

/**
 * Aligne les rappels d'un live sur les règles voulues, sans jamais créer de doublon.
 * Un rappel déjà envoyé ou en échec n'est jamais touché (c'est de l'historique).
 */
export function reconcilier(
  existants: RappelExistant[],
  voulus: RegleRappel[],
  live: { starts_at: string; duree_minutes: number; annule: boolean },
  maintenant: Date,
): PlanRappels {
  const plan: PlanRappels = { aCreer: [], aReplanifier: [], aAnnuler: [], ecartes: [] };
  const now = maintenant.getTime();

  if (live.annule) {
    plan.aAnnuler = existants.filter((e) => e.statut === "prevu").map((e) => e.id);
    return plan;
  }

  const parCle = new Map(existants.map((e) => [cleRappel(e), e]));
  const vues = new Set<string>();
  for (const brut of voulus) {
    const r = validerRegle(brut);
    const cle = cleRappel(r);
    if (vues.has(cle)) continue; // même règle demandée deux fois : une seule
    vues.add(cle);
    if (!CANAUX[r.canal].disponible) { plan.ecartes.push({ regle: r, raison: CANAUX[r.canal].limite }); continue; }
    const prevu_le = echeance(r, live.starts_at, live.duree_minutes);
    const deja = parCle.get(cle);
    if (deja && (deja.statut === "envoye" || deja.statut === "echec")) continue;
    if (new Date(prevu_le).getTime() <= now) {
      plan.ecartes.push({ regle: r, raison: "échéance déjà passée." });
      if (deja && deja.statut === "prevu") plan.aAnnuler.push(deja.id);
      continue;
    }
    if (!deja) plan.aCreer.push({ ...r, prevu_le });
    else if (deja.statut === "annule" || deja.prevu_le !== prevu_le) plan.aReplanifier.push({ id: deja.id, prevu_le });
  }
  for (const e of existants) {
    if (e.statut === "prevu" && !vues.has(cleRappel(e)) && !plan.aAnnuler.includes(e.id)) plan.aAnnuler.push(e.id);
  }
  return plan;
}

export interface EtatRappel {
  code: "prevu" | "echu_non_envoye" | "envoye" | "echec" | "annule" | "incoherent";
  libelle: string;
}

/** Ce qu'on peut AFFIRMER d'un rappel. « Envoyé » exige une confirmation complète. */
export function etatRappel(
  r: { statut: StatutRappel; prevu_le: string; envoye_le: string | null; fournisseur_id: string | null },
  maintenant: Date,
): EtatRappel {
  if (r.statut === "annule") return { code: "annule", libelle: "Annulé" };
  if (r.statut === "echec") return { code: "echec", libelle: "Échec d'envoi" };
  if (r.statut === "envoye") {
    return r.envoye_le && r.fournisseur_id
      ? { code: "envoye", libelle: "Envoyé (confirmé)" }
      : { code: "incoherent", libelle: "Marqué envoyé sans confirmation — non considéré comme envoyé" };
  }
  if (new Date(r.prevu_le).getTime() <= maintenant.getTime()) {
    return { code: "echu_non_envoye", libelle: "Échéance passée — non envoyé (aucun moteur d'envoi actif)" };
  }
  return { code: "prevu", libelle: "Prévu" };
}

/**
 * Le cron existant (`/api/cron/morning`, 08:00 UTC chaque jour) envoie ses propres
 * rappels J-1 / H-1 SEULEMENT si le live commence dans une fenêtre étroite :
 * J-1 si l'heure UTC de début est entre 06:00 et 10:00 ; H-1 entre 07:30 et 09:30.
 * Sert à prévenir d'un doublon possible avec les rappels planifiés ici.
 */
export function fenetreCronExistant(startsAt: string): { veille: boolean; heure: boolean } {
  const d = new Date(startsAt);
  const min = d.getUTCHours() * 60 + d.getUTCMinutes();
  return { veille: min >= 6 * 60 && min <= 10 * 60, heure: min >= 7 * 60 + 30 && min <= 9 * 60 + 30 };
}
