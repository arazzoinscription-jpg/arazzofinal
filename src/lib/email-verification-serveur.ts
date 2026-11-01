import { promises as dns } from "node:dns";
import { analyserEmail, type AnalyseEmail } from "@/lib/email-verification";

/**
 * Le DOMAINE reçoit-il des e-mails ? (enregistrement MX dans le DNS). Côté serveur seulement.
 *
 * « formation-arazzo.com » n'a aucune boîte mail : chaque e-mail qui y partait rebondissait. Une panne du DNS
 * ne bloque jamais personne : seul un « ce domaine n'existe pas / n'a pas de MX » certain est refusé.
 */
const cache = new Map<string, { ok: boolean; at: number }>();
const DUREE_MS = 6 * 60 * 60 * 1000;
const SURS = new Set(["gmail.com", "yahoo.com", "yahoo.fr", "hotmail.com", "hotmail.fr", "outlook.com", "outlook.fr", "live.com", "icloud.com"]);

export async function domaineRecoitEmails(domaine: string): Promise<boolean> {
  const d = domaine.trim().toLowerCase();
  if (!d) return false;
  if (SURS.has(d)) return true;
  const vu = cache.get(d);
  if (vu && Date.now() - vu.at < DUREE_MS) return vu.ok;
  let ok = true;
  try {
    const mx = await Promise.race([
      dns.resolveMx(d),
      new Promise<never>((_, non) => setTimeout(() => non(Object.assign(new Error("délai"), { code: "ETIMEOUT" })), 3000)),
    ]);
    ok = Array.isArray(mx) && mx.some((m) => m.exchange && m.exchange !== ".");
  } catch (e) {
    const code = (e as { code?: string })?.code;
    // Domaine inexistant ou sans MX : certain. Délai / panne réseau : on laisse passer.
    ok = !(code === "ENOTFOUND" || code === "ENODATA" || code === "NXDOMAIN");
  }
  cache.set(d, { ok, at: Date.now() });
  return ok;
}

/** Forme + faute de frappe + jetable, PUIS le domaine. À appeler avant d'enregistrer une adresse. */
export async function verifierEmail(brut: unknown): Promise<AnalyseEmail> {
  const a = analyserEmail(brut);
  if (!a.ok) return a;
  if (!(await domaineRecoitEmails(a.email.split("@")[1]))) {
    return { ok: false, email: a.email, raison: "domaine", message: `Le domaine « ${a.email.split("@")[1]} » ne reçoit pas d’e-mails : vérifiez votre adresse.` };
  }
  return a;
}
