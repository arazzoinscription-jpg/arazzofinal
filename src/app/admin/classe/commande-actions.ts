"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { baseDepuis, espacePour } from "@/lib/espace/load";
import { sendEmail } from "@/lib/email";
import { tplAnnouncement } from "@/lib/email-templates";
import {
  FENETRE_DOUBLON_MIN, LIMITE_EMAILS, PAUSE_ENTRE_EMAILS_MS, emailConfigure, envoyables, etapeFinale, lireCible,
  resumer, texteVersHtml, validerMessage, type EtapeEnvoi, type ResumeDestinataires,
} from "@/lib/classe/commande";
import { destinatairesPour } from "@/lib/classe/destinataires";

/**
 * Envoi d'e-mails par l'enseignante — via le service e-mail EXISTANT (sendEmail → Resend,
 * journal email_log, désinscriptions respectées). Garde-fous, tous côté serveur :
 *  - espace revérifié (formatrice : SES élèves / cours / groupes) ;
 *  - confirmation explicite obligatoire, limite de destinataires, pause entre envois ;
 *  - aucun appel au fournisseur si le service n'est pas configuré (clé absente) ;
 *  - pas de doublon : même objet à la même élève dans les 10 dernières minutes = ignoré.
 * Le résultat ne dit « envoyé » que pour les e-mails CONFIRMÉS par le service.
 */

export type ReponseApercu =
  | { ok: true; resume: ResumeDestinataires; serviceConfigure: boolean; limite: number }
  | { ok: false; erreur: string };

export type ReponseEnvoi =
  | { ok: true; etape: EtapeEnvoi; tentes: number; envoyes: number; ignores: number; doublons: number; echecs: number; message: string }
  | { ok: false; etape: EtapeEnvoi; erreur: string };

const categorieDe = (type: string) => (type === "eleve" ? "private_msg" : "announcements") as "private_msg" | "announcements";

export async function apercuEmailAction(entree: { base: string; cible: unknown }): Promise<ReponseApercu> {
  const espace = await espacePour(baseDepuis(entree.base));
  if (!espace) return { ok: false, erreur: "Accès refusé." };
  const cible = lireCible(entree.cible);
  if (!cible) return { ok: false, erreur: "Destinataire invalide." };
  try {
    const ds = await destinatairesPour(createAdminClient(), espace, cible, categorieDe(cible.type));
    return { ok: true, resume: resumer(ds), serviceConfigure: emailConfigure(process.env.RESEND_API_KEY), limite: LIMITE_EMAILS };
  } catch (e) {
    return { ok: false, erreur: e instanceof Error ? e.message : "Lecture impossible." };
  }
}

export async function envoyerEmailAction(entree: { base: string; cible: unknown; sujet: unknown; corps: unknown; confirmation: unknown }): Promise<ReponseEnvoi> {
  const espace = await espacePour(baseDepuis(entree.base));
  if (!espace) return { ok: false, etape: "bloque", erreur: "Accès refusé." };
  const cible = lireCible(entree.cible);
  if (!cible) return { ok: false, etape: "bloque", erreur: "Destinataire invalide." };
  const v = validerMessage(entree.sujet, entree.corps);
  if (!v.ok) return { ok: false, etape: "bloque", erreur: v.erreur };
  if (entree.confirmation !== true) return { ok: false, etape: "bloque", erreur: "Confirmez l'envoi (case à cocher) avant d'envoyer." };
  if (!emailConfigure(process.env.RESEND_API_KEY)) {
    return { ok: false, etape: "bloque", erreur: "Service e-mail non configuré sur ce serveur (clé Resend absente) : aucun e-mail n'a été tenté." };
  }

  const admin = createAdminClient();
  const ds = await destinatairesPour(admin, espace, cible, categorieDe(cible.type));
  const cibles = envoyables(ds);
  if (!cibles.length) return { ok: false, etape: "bloque", erreur: "Aucun destinataire joignable (adresse absente ou désinscription)." };
  if (cibles.length > LIMITE_EMAILS) {
    return { ok: false, etape: "bloque", erreur: `${cibles.length} destinataires : au-delà de ${LIMITE_EMAILS}, utilisez « Annonce de classe » (option e-mail).` };
  }

  // Anti-doublon : même objet déjà ENVOYÉ à la même élève récemment (double clic, page renvoyée…).
  const depuis = new Date(Date.now() - FENETRE_DOUBLON_MIN * 60_000).toISOString();
  const deja = await admin.from("email_log").select("user_id").eq("subject", v.sujet).eq("status", "sent")
    .gte("created_at", depuis).in("user_id", cibles.map((c) => c.id));
  const dejaEnvoye = new Set(((deja.data ?? []) as { user_id: string }[]).map((x) => x.user_id));

  let envoyes = 0; let ignores = 0; let echecs = 0; let doublons = 0; let tentes = 0;
  for (const d of cibles) {
    if (dejaEnvoye.has(d.id)) { doublons += 1; continue; }
    const tpl = tplAnnouncement(d.nom.split(/\s+/)[0] || "chère élève", v.sujet, texteVersHtml(v.corps));
    tentes += 1;
    // eslint-disable-next-line no-await-in-loop
    const r = await sendEmail({ userId: d.id, to: d.email as string, category: categorieDe(cible.type), subject: v.sujet, html: tpl.html });
    if (r.ok) envoyes += 1; else if (r.skipped) ignores += 1; else echecs += 1;
    // eslint-disable-next-line no-await-in-loop
    if (tentes < cibles.length) await new Promise((ok) => setTimeout(ok, PAUSE_ENTRE_EMAILS_MS));
  }
  const etape = etapeFinale({ tentes, envoyes, echecs: echecs + ignores });
  const morceaux = [`${envoyes} e-mail(s) confirmé(s) par le service`];
  if (ignores) morceaux.push(`${ignores} non envoyé(s) (désinscription)`);
  if (echecs) morceaux.push(`${echecs} échec(s)`);
  if (doublons) morceaux.push(`${doublons} déjà envoyé(s) il y a moins de ${FENETRE_DOUBLON_MIN} min : ignoré(s)`);
  return { ok: true, etape, tentes, envoyes, ignores, doublons, echecs, message: morceaux.join(" · ") + "." };
}
