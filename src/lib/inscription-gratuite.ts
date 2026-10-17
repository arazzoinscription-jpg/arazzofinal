/**
 * Inscription GRATUITE par lien partagé (réseaux, réponse automatique SuperProfile) — règles PURES (testables).
 *
 * Le lien /inscription (ou /inscription/<page>) : un formulaire → un compte « visiteuse » sur le site
 * (sans formation : missions, leçon d'essai), connexion immédiate, e-mail d'accès, et le cours gratuit
 * de la Delivery Page. Prévu pour des centaines d'inscriptions par jour : protections anti-robots ici.
 */

export interface DonneesInscription {
  nom: string;
  email: string;
  telephone: string | null;
  wilaya: string | null;
}

const texte = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "");

/** Domaines d'adresses jetables (inscriptions de robots, e-mails jamais lus). */
const JETABLES = new Set([
  "mailinator.com", "yopmail.com", "yopmail.fr", "guerrillamail.com", "10minutemail.com", "tempmail.com", "temp-mail.org",
  "trashmail.com", "sharklasers.com", "getnada.com", "dispostable.com", "maildrop.cc", "throwawaymail.com", "fakeinbox.com",
]);

/** Vérifie la saisie ; renvoie les données propres, ou l'erreur à afficher. */
export function lireInscription(brut: { nom?: unknown; email?: unknown; telephone?: unknown; wilaya?: unknown }):
  { ok: true; donnees: DonneesInscription } | { ok: false; erreur: "nom" | "email" | "jetable" } {
  const nom = texte(brut.nom, 80);
  const email = texte(brut.email, 160).toLowerCase();
  const telephone = texte(brut.telephone, 30).replace(/[^\d+]/g, "") || null;
  const wilaya = texte(brut.wilaya, 60) || null;
  if (nom.length < 2) return { ok: false, erreur: "nom" };
  if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(email)) return { ok: false, erreur: "email" };
  if (JETABLES.has(email.split("@")[1])) return { ok: false, erreur: "jetable" };
  return { ok: true, donnees: { nom, email, telephone, wilaya } };
}

/** Fautes de frappe fréquentes dans le domaine de l'adresse (gmial.com → gmail.com). */
const CORRECTIONS: Record<string, string> = {
  "gmial.com": "gmail.com", "gmal.com": "gmail.com", "gmaill.com": "gmail.com", "gmail.co": "gmail.com", "gmail.fr": "gmail.com",
  "gamil.com": "gmail.com", "gnail.com": "gmail.com", "gmail.cm": "gmail.com", "gmail.om": "gmail.com", "gmai.com": "gmail.com",
  "hotmial.com": "hotmail.com", "hotmai.com": "hotmail.com", "hotmail.co": "hotmail.com", "hotmal.com": "hotmail.com",
  "yahou.com": "yahoo.com", "yaho.com": "yahoo.com", "yahoo.co": "yahoo.com", "yhoo.com": "yahoo.com",
  "outlok.com": "outlook.com", "outlook.co": "outlook.com", "iclod.com": "icloud.com", "icloud.co": "icloud.com",
};

/** « amina@gmial.com » → « amina@gmail.com » (à proposer), sinon null. */
export function suggestionEmail(email: string): string | null {
  const [local, domaine] = email.trim().toLowerCase().split("@");
  if (!local || !domaine) return null;
  const bon = CORRECTIONS[domaine];
  return bon ? `${local}@${bon}` : null;
}

/** Délai minimal entre l'ouverture du formulaire et l'envoi : en dessous, c'est un robot. */
export const DELAI_HUMAIN_MS = 2500;

/** Pièges à robots : champ invisible rempli, ou formulaire envoyé trop vite après l'ouverture. */
export function estRobot(p: { piege: unknown; ouvertLe: unknown; maintenant: number }): boolean {
  if (typeof p.piege === "string" && p.piege.trim() !== "") return true;
  const t = typeof p.ouvertLe === "number" ? p.ouvertLe : Number(p.ouvertLe);
  if (!Number.isFinite(t) || t <= 0) return true;
  return p.maintenant - t < DELAI_HUMAIN_MS;
}

/** Un mot de passe facile à recopier sur un téléphone (sans 0/O ni 1/l), à partir d'octets aléatoires. */
export function motDePasseLisible(octets: Uint8Array): string {
  const lettres = "abcdefghjkmnpqrstuvwxyz";
  const chiffres = "23456789";
  const p = (i: number, jeu: string) => jeu[octets[i % octets.length] % jeu.length];
  return `${p(0, lettres).toUpperCase()}${p(1, lettres)}${p(2, lettres)}${p(3, lettres)}-${p(4, chiffres)}${p(5, chiffres)}${p(6, chiffres)}${p(7, chiffres)}`;
}
