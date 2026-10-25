"use server";

import { randomBytes } from "crypto";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createPublicClient } from "@/lib/supabase/public";
import { sendEmail } from "@/lib/email";
import { createPasswordSetupLink } from "@/lib/magic-link";
import { checkRateLimit, getClientIp } from "@/lib/security/rateLimit";
import { estRobot, lireInscription, motDePasseLisible, suggestionEmail } from "@/lib/inscription-gratuite";
import { emailCompteCree, emailDejaInscrite } from "@/lib/inscription-gratuite-email";

/**
 * Lien d'inscription GRATUITE (/inscription ou /inscription/<page>) partagé sur les réseaux :
 * formulaire → compte « visiteuse » sur le site (aucune formation : missions, leçon d'essai) → connexion
 * immédiate → e-mail d'accès (identifiant, mot de passe, plateforme, application). Le cours gratuit d'une
 * Delivery Page n'est donné QUE par le lien de cette page (/inscription/<page>) : la personne devient alors son
 * prospect (CRM de l'OS). /inscription seul crée le compte, sans cadeau d'office.
 *
 * Prévu pour des centaines d'inscriptions par jour : anti-robots (champ piège, délai, Turnstile si configuré),
 * limite par adresse, un seul compte par e-mail (jamais de mot de passe changé pour un compte existant).
 */

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://www.formation-arazzo.store";

export type ResultatInscription =
  | { ok: true; statut: "cree" | "existant"; coursHref: string | null; connectee: boolean; emailEnvoye: boolean }
  | { ok: false; erreur: string; suggestion?: string };

/** Vérifie le jeton Cloudflare Turnstile — seulement si les clés sont configurées (sinon les autres protections suffisent). */
async function turnstileValide(jeton: unknown, ip: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true;
  if (typeof jeton !== "string" || !jeton) return false;
  try {
    const corps = new URLSearchParams({ secret, response: jeton, ...(ip !== "unknown" ? { remoteip: ip } : {}) });
    const r = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body: corps });
    const d = (await r.json()) as { success?: boolean };
    return d.success === true;
  } catch {
    return false;
  }
}

/** La Delivery Page du cours gratuit — seulement si le lien en nomme une, et qu'elle est ouverte — ou null. */
async function pageCours(slugDemande: unknown): Promise<{ slug: string; titre: string | null; source: string | null; campaign: string | null } | null> {
  const slug = typeof slugDemande === "string" && slugDemande.trim() ? slugDemande.trim().slice(0, 160) : null;
  if (!slug) return null;
  const { data } = await createPublicClient().from("delivery_page_snapshots").select("data").eq("slug", slug).maybeSingle();
  const page = (data?.data ?? null) as Record<string, unknown> | null;
  if (!page || page.active !== true) return null;
  return { slug, titre: (page.title as string | null) ?? null, source: (page.source as string | null) ?? null, campaign: (page.campaign as string | null) ?? null };
}

export async function inscrireGratuitement(entree: {
  slug?: unknown; nom: unknown; email: unknown; telephone?: unknown; wilaya?: unknown; consent?: unknown;
  piege?: unknown; ouvertLe?: unknown; jeton?: unknown; utm?: unknown;
}): Promise<ResultatInscription> {
  // 1) Robots : piège + délai, puis Turnstile, puis limite par adresse.
  if (estRobot({ piege: entree.piege, ouvertLe: entree.ouvertLe, maintenant: Date.now() })) {
    return { ok: false, erreur: "Un instant… vérifiez vos informations puis réessayez." };
  }
  const h = await headers();
  const ip = getClientIp(h);
  if (!(await turnstileValide(entree.jeton, ip))) return { ok: false, erreur: "Vérification anti-robot non validée : réessayez." };
  if (!(await checkRateLimit("inscription", ip)).ok) return { ok: false, erreur: "Trop d'inscriptions depuis cette connexion : réessayez dans un moment." };

  // 2) Saisie.
  const lu = lireInscription({ nom: entree.nom, email: entree.email, telephone: entree.telephone, wilaya: entree.wilaya });
  if (!lu.ok) {
    if (lu.erreur === "nom") return { ok: false, erreur: "Indiquez votre nom et prénom." };
    if (lu.erreur === "jetable") return { ok: false, erreur: "Utilisez votre adresse e-mail habituelle (pas une adresse temporaire)." };
    return { ok: false, erreur: "Adresse e-mail invalide.", suggestion: suggestionEmail(String(entree.email ?? "")) ?? undefined };
  }
  const d = lu.donnees;
  const utm = (entree.utm && typeof entree.utm === "object" ? entree.utm : {}) as Record<string, string>;

  // 3) Le cours gratuit (Delivery Page) et la fiche prospect pour le CRM de l'OS (rapatriée au « Synchroniser »).
  const page = await pageCours(entree.slug).catch(() => null);
  const coursHref = page ? `${SITE}/free/${encodeURIComponent(page.slug)}?acces=1` : null;
  if (page) {
    try {
      await createPublicClient().from("delivery_page_leads").insert({
        slug: page.slug, full_name: d.nom, phone: d.telephone, email: d.email, wilaya: d.wilaya, consent: entree.consent === true,
        lang: "fr", source: utm.utm_source || "inscription-gratuite",
        utm: Object.keys(utm).length ? utm : (page.campaign ? { utm_campaign: page.campaign } : null),
      });
    } catch { /* le compte compte plus que la fiche : on continue */ }
  }

  // 4) Déjà un compte avec cet e-mail : rien n'est modifié, on lui renvoie ses accès.
  const admin = createAdminClient();
  const { data: existant } = await admin.from("users").select("id").ilike("email", d.email.replace(/[\\%_]/g, (c) => `\\${c}`)).maybeSingle();
  const renvoyerAcces = async () => {
    const lien = await createPasswordSetupLink(d.email).catch(() => null);
    const { subject, html } = emailDejaInscrite({ nom: d.nom, email: d.email, lienMotDePasse: lien?.ok ? lien.link : null, coursHref, coursTitre: page?.titre ?? null });
    try { return (await sendEmail({ to: d.email, category: "welcome", force: true, subject, html })).ok; } catch { return false; }
  };
  if (existant) return { ok: true, statut: "existant", coursHref, connectee: false, emailEnvoye: await renvoyerAcces() };

  // 5) Le compte (visiteuse : aucune formation), avec un mot de passe facile à recopier.
  const motDePasse = motDePasseLisible(randomBytes(8));
  const { error: erreurCompte } = await admin.auth.admin.createUser({
    email: d.email, password: motDePasse, email_confirm: true,
    user_metadata: { nom: d.nom, phone: d.telephone, wilaya: d.wilaya, account_type: "formations", source: "inscription-gratuite" },
  });
  if (erreurCompte) {
    // Compte de connexion déjà présent (profil incomplet) : même réponse qu'un compte existant.
    if (/already|registered|exists/i.test(erreurCompte.message)) return { ok: true, statut: "existant", coursHref, connectee: false, emailEnvoye: await renvoyerAcces() };
    return { ok: false, erreur: "Création du compte impossible pour le moment, réessayez dans quelques minutes." };
  }

  // 6) Connexion immédiate (l'accès ne dépend pas de l'e-mail), puis l'e-mail d'accès.
  let connectee = false;
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({ email: d.email, password: motDePasse });
    connectee = !error;
  } catch { /* elle se connectera avec l'e-mail */ }
  const { subject, html } = emailCompteCree({ nom: d.nom, email: d.email, motDePasse, coursHref, coursTitre: page?.titre ?? null });
  let emailEnvoye = false;
  try { emailEnvoye = (await sendEmail({ to: d.email, category: "welcome", force: true, subject, html })).ok; } catch { /* tracé dans email_log */ }
  return { ok: true, statut: "cree", coursHref, connectee, emailEnvoye };
}
