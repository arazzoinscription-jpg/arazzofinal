/**
 * VÉRIFIER UNE ADRESSE E-MAIL avant de l'enregistrer — règles PURES (testables) + contrôle du domaine (serveur).
 *
 * Pourquoi : des adresses mal tapées (« gamil.com », « gmail.c ») et des domaines sans boîte mail faisaient
 * REBONDIR jusqu'à un quart des e-mails envoyés. Au-delà de quelques pour cent de rebonds, Gmail et les autres
 * classent l'expéditeur comme douteux : TOUS les e-mails de l'école partent alors en indésirables.
 */

/** Domaines d'adresses jetables (inscriptions de robots, e-mails jamais lus). */
const JETABLES = new Set([
  "mailinator.com", "yopmail.com", "yopmail.fr", "guerrillamail.com", "10minutemail.com", "tempmail.com", "temp-mail.org",
  "trashmail.com", "sharklasers.com", "getnada.com", "dispostable.com", "maildrop.cc", "throwawaymail.com", "fakeinbox.com",
]);

/** Les messageries réelles des élèves : une faute à une ou deux lettres près est une faute de frappe. */
const CONNUS = [
  "gmail.com", "yahoo.com", "yahoo.fr", "hotmail.com", "hotmail.fr", "outlook.com", "outlook.fr", "live.com", "live.fr",
  "icloud.com", "msn.com", "aol.com", "orange.fr", "free.fr", "laposte.net", "sfr.fr", "ymail.com", "protonmail.com",
];

/** Corrections sûres, vues chez les élèves (gamil, glail…) ou classiques. */
const CORRECTIONS: Record<string, string> = {
  "gmial.com": "gmail.com", "gmal.com": "gmail.com", "gmaill.com": "gmail.com", "gmail.co": "gmail.com", "gmail.fr": "gmail.com",
  "gamil.com": "gmail.com", "gnail.com": "gmail.com", "gmail.cm": "gmail.com", "gmail.om": "gmail.com", "gmai.com": "gmail.com",
  "glail.com": "gmail.com", "gmail.c": "gmail.com", "gmail.con": "gmail.com", "gmail.cim": "gmail.com", "gmail.dz": "gmail.com",
  "gmail": "gmail.com", "g.mail.com": "gmail.com", "gemail.com": "gmail.com", "gmeil.com": "gmail.com", "jmail.com": "gmail.com",
  "hotmial.com": "hotmail.com", "hotmai.com": "hotmail.com", "hotmail.co": "hotmail.com", "hotmal.com": "hotmail.com",
  "yahou.com": "yahoo.com", "yaho.com": "yahoo.com", "yahoo.co": "yahoo.com", "yhoo.com": "yahoo.com",
  "outlok.com": "outlook.com", "outlook.co": "outlook.com", "iclod.com": "icloud.com", "icloud.co": "icloud.com",
};

/** Distance d'édition (insertions, suppressions, substitutions, inversions de deux lettres voisines). */
function distance(a: string, b: string): number {
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j += 1) d[0][j] = j;
  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      const cout = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cout);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  }
  return d[a.length][b.length];
}

/** Le domaine probablement voulu (« gmali.com » → « gmail.com »), ou null s'il est déjà juste ou inconnu. */
export function domaineCorrige(domaine: string): string | null {
  const d = domaine.trim().toLowerCase();
  if (CONNUS.includes(d)) return null;
  if (CORRECTIONS[d]) return CORRECTIONS[d];
  let meilleur: string | null = null;
  let dMin = 3;
  for (const c of CONNUS) {
    const x = distance(d, c);
    if (x < dMin) { dMin = x; meilleur = c; }
  }
  // Deux fautes au plus, et seulement si le domaine tapé ressemble vraiment (pas « gml.dz » → « gmail.com »).
  return meilleur && dMin <= (d.length >= 8 ? 2 : 1) ? meilleur : null;
}

export type AnalyseEmail =
  | { ok: true; email: string }
  | { ok: false; email: string; raison: "format" | "jetable" | "faute" | "domaine"; suggestion?: string; message: string };

/** Forme, adresse jetable, faute de frappe dans le domaine. Sans réseau : sert aussi dans le navigateur. */
export function analyserEmail(brut: unknown): AnalyseEmail {
  const email = (typeof brut === "string" ? brut : "").trim().toLowerCase().replace(/\s+/g, "");
  const format = /^[a-z0-9._%+'-]+@[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$/i;
  if (!format.test(email) || email.includes("..")) {
    const sugg = suggestion(email);
    return { ok: false, email, raison: "format", ...(sugg ? { suggestion: sugg } : {}), message: sugg ? `Adresse incomplète : vouliez-vous dire ${sugg} ?` : "Adresse e-mail invalide : vérifiez-la." };
  }
  const [, domaine] = email.split("@");
  if (JETABLES.has(domaine)) return { ok: false, email, raison: "jetable", message: "Les adresses e-mail temporaires ne sont pas acceptées : utilisez votre adresse habituelle." };
  const sugg = suggestion(email);
  if (sugg) return { ok: false, email, raison: "faute", suggestion: sugg, message: `Vouliez-vous dire ${sugg} ? Vérifiez votre adresse e-mail.` };
  return { ok: true, email };
}

/** « amina@gamil.com » → « amina@gmail.com », sinon null. */
export function suggestion(email: string): string | null {
  const [local, domaine] = email.trim().toLowerCase().split("@");
  if (!local || !domaine) return null;
  const bon = domaineCorrige(domaine);
  return bon ? `${local}@${bon}` : null;
}

/** Le message d'erreur à montrer pour une adresse refusée par un schéma (zod). */
export const MESSAGE_EMAIL = "Adresse e-mail invalide ou mal tapée : vérifiez-la.";
