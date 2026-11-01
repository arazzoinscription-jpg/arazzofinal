"use server";

import { headers } from "next/headers";
import { getClientIp } from "@/lib/security/rateLimit";
import { turnstileValide } from "@/lib/security/turnstile";
import { verifierEmail } from "@/lib/email-verification-serveur";

/**
 * Avant de créer un compte ou de se connecter (formulaires du navigateur) : la case anti-robots Cloudflare,
 * et — à l'inscription — l'adresse e-mail (forme, faute de frappe, domaine qui reçoit des e-mails).
 */
export async function verifierAvantCompte(entree: { jeton?: unknown; email?: unknown; inscription?: boolean; sansCase?: boolean }):
  Promise<{ ok: true; email?: string } | { ok: false; erreur: string; suggestion?: string }> {
  const ip = getClientIp(await headers());
  // La case Cloudflare n'a pas pu s'afficher chez la visiteuse : on ne bloque pas (la page n'est pas la seule porte
  // d'un robot — l'adresse, elle, reste vérifiée).
  if (!entree.sansCase && !(await turnstileValide(entree.jeton, ip))) return { ok: false, erreur: "Vérification anti-robot non validée : cochez la case puis réessayez." };
  if (!entree.inscription) return { ok: true };
  const v = await verifierEmail(entree.email);
  if (!v.ok) return { ok: false, erreur: v.message, ...(v.suggestion ? { suggestion: v.suggestion } : {}) };
  return { ok: true, email: v.email };
}

/** Une adresse saisie dans un formulaire : bonne, ou le message (avec la correction proposée). */
export async function controlerEmail(email: unknown): Promise<{ ok: true; email: string } | { ok: false; erreur: string; suggestion?: string }> {
  const v = await verifierEmail(email);
  return v.ok ? { ok: true, email: v.email } : { ok: false, erreur: v.message, ...(v.suggestion ? { suggestion: v.suggestion } : {}) };
}
