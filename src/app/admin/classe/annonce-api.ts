/**
 * « Annonce de classe » — appelle le Centre d'annonces EXISTANT (/api/announcements/send),
 * qui revérifie tout côté serveur (rôle, cours de la formatrice, doublon, service e-mail).
 * Seul appel réseau autorisé de « Ma classe » (garde-fou dans classe.test.ts).
 */

export const ROUTE_ANNONCES = "/api/announcements/send";

export interface ApercuAnnonce {
  audience: number;
  emailsPossibles: number;
  desinscrites: number;
  sansEmail: number;
  categorieCoupee: boolean;
  serviceEmail: boolean;
}

export interface ResultatAnnonce {
  audience: number;
  notifications: number;
  emailsSent: number;
  emailsSkipped: number;
  emailsFailed: number;
  emailsNonTentes: boolean;
  serviceEmail: boolean;
}

type Reponse<T> = { ok: true; donnees: T } | { ok: false; statut: number; erreur: string };

async function appeler<T>(corps: Record<string, unknown>): Promise<Reponse<T>> {
  try {
    const res = await fetch(ROUTE_ANNONCES, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(corps) });
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) return { ok: false, statut: res.status, erreur: typeof data.error === "string" ? data.error : `Erreur ${res.status}` };
    return { ok: true, donnees: data as T };
  } catch {
    return { ok: false, statut: 0, erreur: "Connexion impossible : rien n'a été publié." };
  }
}

export function apercuAnnonce(a: { titre: string; texte: string; courseId: string; email: boolean }) {
  return appeler<ApercuAnnonce>({ titre: a.titre, body: a.texte, course_id: a.courseId, sendEmail: a.email, apercu: true });
}

export function publierAnnonce(a: { titre: string; texte: string; courseId: string; email: boolean }) {
  return appeler<ResultatAnnonce>({ titre: a.titre, body: a.texte, course_id: a.courseId, sendEmail: a.email });
}
