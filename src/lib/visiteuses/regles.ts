/**
 * Comptes SANS formation (« visiteuses ») — règles PURES (testables).
 *
 * Décision de l'école (2026-10-16) :
 *  A. une visiteuse aime, commente, suit, réagit aux stories, répond aux questions et sondages ;
 *  B. elle peut publier (vidéo, photo, story, défi) MAIS sa publication attend la validation de l'équipe.
 * Et cinq missions sur le feed : bienvenue (cadeau), leçon d'essai, défi de la semaine,
 * « J'aimerais apprendre ce modèle », pastille « Visiteuse » + invitation à rejoindre une classe.
 */

/** Inscrite = une formation (au moins une inscription) ou un rôle de l'équipe. Sinon : visiteuse. */
export function estInscriteSelon(p: { roles: string[]; inscriptions: number }): boolean {
  return p.inscriptions > 0 || p.roles.some((r) => r === "admin" || r === "formateur" || r === "patronniste");
}

/** Ce que devient une publication : en ligne tout de suite (inscrite) ou en attente de validation (visiteuse). */
export function statutPublication(inscrite: boolean): { published: boolean; a_valider: boolean } {
  return inscrite ? { published: true, a_valider: false } : { published: false, a_valider: true };
}

export const MESSAGE_EN_ATTENTE = "Merci ! Votre publication sera visible dès que l'équipe l'aura validée.";

// ─── Mission 1 : bienvenue ─────────────────────────────────────────────────

export const AIMES_REQUIS = 3;

export type CleEtape = "test" | "suivre" | "aimer" | "question";

export interface DonneesBienvenue {
  /** Un passage du test de niveau avec son e-mail. */
  testFait: boolean;
  /** Elle suit au moins une enseignante. */
  suitEnseignante: boolean;
  /** Nombre de créations aimées. */
  aimes: number;
  /** Réponse ou vote sur une story de l'équipe, ou un commentaire. */
  aRepondu: boolean;
}

export interface EtapeBienvenue { cle: CleEtape; titre: string; detail: string; fait: boolean }

export function etapesBienvenue(d: DonneesBienvenue): EtapeBienvenue[] {
  return [
    { cle: "test", titre: "Passer le test de niveau", detail: "Gratuit, 2 minutes : découvrez votre niveau de couture.", fait: d.testFait },
    { cle: "suivre", titre: "Suivre l'enseignante", detail: "Pour voir ses cours, ses lives et ses conseils.", fait: d.suitEnseignante },
    { cle: "aimer", titre: `Aimer ${AIMES_REQUIS} créations`, detail: `${Math.min(d.aimes, AIMES_REQUIS)} / ${AIMES_REQUIS} — touchez ❤️ sur les vidéos qui vous plaisent.`, fait: d.aimes >= AIMES_REQUIS },
    { cle: "question", titre: "Répondre à la question du jour", detail: "Dans la story de l'enseignante (cercle « PROF » en haut), ou laissez un commentaire sous une vidéo.", fait: d.aRepondu },
  ];
}

/** Le cadeau est débloqué quand les 4 étapes sont faites ; une fois débloqué, il reste acquis. */
export function cadeauDebloque(etapes: EtapeBienvenue[], dejaDebloque: boolean): boolean {
  return dejaDebloque || etapes.every((e) => e.fait);
}

// ─── Mission 3 : défi de la semaine ─────────────────────────────────────────

export interface DefiBrut { id: string; titre: string; consigne: string; recompense: string; debut: string; fin: string; gagnant_media_id: string | null }

/** Le défi en cours (commencé, pas fini) le plus récent ; sinon null. */
export function defiEnCours<T extends Pick<DefiBrut, "debut" | "fin">>(defis: T[], maintenant: Date): T | null {
  const t = maintenant.getTime();
  return [...defis]
    .filter((d) => new Date(d.debut).getTime() <= t && new Date(d.fin).getTime() > t)
    .sort((a, b) => b.debut.localeCompare(a.debut))[0] ?? null;
}

/** Vérifie la saisie d'un défi par l'équipe. */
export function lireDefi(brut: { titre?: unknown; consigne?: unknown; recompense?: unknown; fin?: unknown }, maintenant: Date):
  { ok: true; defi: { titre: string; consigne: string; recompense: string; fin: string } } | { ok: false; erreur: string } {
  const titre = typeof brut.titre === "string" ? brut.titre.replace(/\s+/g, " ").trim().slice(0, 120) : "";
  const consigne = typeof brut.consigne === "string" ? brut.consigne.trim().slice(0, 1500) : "";
  const recompense = typeof brut.recompense === "string" ? brut.recompense.replace(/\s+/g, " ").trim().slice(0, 300) : "";
  const fin = typeof brut.fin === "string" ? new Date(brut.fin) : null;
  if (titre.length < 2) return { ok: false, erreur: "Donnez un titre au défi (ex. « Coudre une trousse »)." };
  if (!fin || Number.isNaN(fin.getTime())) return { ok: false, erreur: "Choisissez la date de fin du défi." };
  const ms = fin.getTime() - maintenant.getTime();
  if (ms < 3_600_000) return { ok: false, erreur: "La fin du défi doit être dans au moins une heure." };
  if (ms > 31 * 86_400_000) return { ok: false, erreur: "Un défi dure un mois au plus." };
  return { ok: true, defi: { titre, consigne, recompense, fin: fin.toISOString() } };
}

// ─── Mission 4 : « J'aimerais apprendre ce modèle » ─────────────────────────

/**
 * La formation à proposer pour un modèle : celle de la vidéo (teaser de cours, travail pratique),
 * sinon le niveau trouvé au test, sinon le Niveau 1.
 */
export function formationSuggeree(media: { courseSlug: string | null; courseTitre: string | null }, niveauTest: string | null):
  { titre: string; href: string } {
  if (media.courseSlug) return { titre: media.courseTitre || "la formation de ce modèle", href: `/formations/${media.courseSlug}` };
  const n = niveauTest?.match(/(\d)/)?.[1];
  if (n && ["1", "2", "3"].includes(n)) return { titre: `Niveau ${n}`, href: `/formation/niveau-${n}` };
  return { titre: "Niveau 1", href: "/formation/niveau-1" };
}

// ─── Mission 5 : invitation à rejoindre une classe ──────────────────────────

/** Après ce nombre de gestes (j'aime, commentaires, abonnements, réponses aux stories), on l'invite. */
export const SEUIL_INVITATION = 5;
/** Refermée : elle revient au plus tôt 3 jours plus tard. */
export const PAUSE_INVITATION_MS = 3 * 86_400_000;

export function doitInviter(gestes: number, fermeeLe: number | null, maintenant: number): boolean {
  if (gestes < SEUIL_INVITATION) return false;
  return !fermeeLe || maintenant - fermeeLe >= PAUSE_INVITATION_MS;
}
