/**
 * Espace de commande de l'enseignante — règles PURES (testables), sans aucun envoi.
 * Les étapes d'un envoi sont toujours distinguées :
 *   préparé (rien n'est parti) → déclenché (requête en cours) → confirmé par le service
 *   (ou partiel / échec / bloqué, avec la raison).
 */

export const LIMITE_EMAILS = 50;
/** Délai entre deux e-mails (Resend accepte 2 envois par seconde). */
export const PAUSE_ENTRE_EMAILS_MS = 550;
/** Un même e-mail (même objet) n'est pas renvoyé à la même élève dans ce délai. */
export const FENETRE_DOUBLON_MIN = 10;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type CibleCommande =
  | { type: "eleve"; id: string }
  | { type: "niveau"; courseId: string }
  | { type: "groupe"; id: string };

export function lireCible(brut: unknown): CibleCommande | null {
  const c = brut as { type?: unknown; id?: unknown; courseId?: unknown } | null;
  if (!c || typeof c !== "object") return null;
  if (c.type === "eleve" && typeof c.id === "string" && UUID.test(c.id)) return { type: "eleve", id: c.id };
  if (c.type === "groupe" && typeof c.id === "string" && UUID.test(c.id)) return { type: "groupe", id: c.id };
  if (c.type === "niveau" && typeof c.courseId === "string" && UUID.test(c.courseId)) return { type: "niveau", courseId: c.courseId };
  return null;
}

export function validerMessage(sujet: unknown, corps: unknown): { ok: true; sujet: string; corps: string } | { ok: false; erreur: string } {
  const s = typeof sujet === "string" ? sujet.trim() : "";
  const c = typeof corps === "string" ? corps.trim() : "";
  if (s.length < 3 || s.length > 150) return { ok: false, erreur: "L'objet doit faire entre 3 et 150 caractères." };
  if (c.length < 10 || c.length > 5000) return { ok: false, erreur: "Le message doit faire entre 10 et 5 000 caractères." };
  return { ok: true, sujet: s, corps: c };
}

/** Texte saisi → HTML sûr (échappé), retours à la ligne conservés. */
export function texteVersHtml(t: string): string {
  return t
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;")
    .replace(/\r?\n/g, "<br/>");
}

export interface Destinataire {
  id: string;
  nom: string;
  email: string | null;
  /** false = désinscrite de cette catégorie (ou catégorie coupée par l'administration) ; null = pas de préférence enregistrée. */
  emailAutorise: boolean | null;
}

export interface ResumeDestinataires {
  total: number;
  /** Adresse présente ET pas de désinscription : l'e-mail sera tenté. */
  envoyables: number;
  desinscrites: number;
  sansEmail: number;
  /** Quelques prénoms pour l'aperçu (jamais les adresses). */
  apercuNoms: string[];
}

const emailValide = (e: string | null) => Boolean(e && /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/.test(e));

export function envoyables(ds: Destinataire[]): Destinataire[] {
  return ds.filter((d) => emailValide(d.email) && d.emailAutorise !== false);
}

export function resumer(ds: Destinataire[]): ResumeDestinataires {
  return {
    total: ds.length,
    envoyables: envoyables(ds).length,
    desinscrites: ds.filter((d) => emailValide(d.email) && d.emailAutorise === false).length,
    sansEmail: ds.filter((d) => !emailValide(d.email)).length,
    apercuNoms: ds.slice(0, 6).map((d) => d.nom.split(/\s+/)[0] || "Élève"),
  };
}

/** Le service e-mail est-il réellement configuré ? (jamais d'appel au fournisseur sans clé réelle) */
export function emailConfigure(cle: string | undefined | null): boolean {
  const k = (cle ?? "").trim();
  return k.length > 10 && k !== "re_placeholder_build_key";
}

export type EtapeEnvoi = "prepare" | "declenche" | "confirme" | "partiel" | "echec" | "bloque";

export const LIBELLE_ETAPE: Record<EtapeEnvoi, string> = {
  prepare: "Préparé — rien n'est encore parti",
  declenche: "Envoi déclenché — en attente de la réponse du service…",
  confirme: "Confirmé par le service",
  partiel: "Partiellement envoyé",
  echec: "Échec — rien n'a été confirmé",
  bloque: "Bloqué — aucun envoi tenté",
};

/** Étape finale d'un envoi d'e-mails d'après les réponses RÉELLES du service. */
export function etapeFinale(r: { envoyes: number; echecs: number; tentes: number }): EtapeEnvoi {
  if (r.tentes === 0) return "bloque";
  if (r.envoyes === r.tentes) return "confirme";
  if (r.envoyes === 0) return "echec";
  return "partiel";
}
