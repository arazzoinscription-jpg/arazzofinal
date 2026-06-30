import "server-only";
import { randomUUID } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { brandedSiteUrl } from "@/lib/site-url";

const SITE = brandedSiteUrl();
const VALIDITY_MS = 48 * 60 * 60 * 1000; // 48 heures (défaut)
/** Durée longue pour activation de compte / mot de passe oublié (~1 an). */
export const LONG_VALIDITY_MS = 365 * 24 * 60 * 60 * 1000;

/**
 * Crée un lien d'accès branché (domaine Arazzo). Valable 48h par défaut ;
 * passer `validityMs` (ex. LONG_VALIDITY_MS) pour un lien longue durée
 * (activation de compte / réinitialisation de mot de passe).
 * La route /acces/<token> génère un lien Supabase frais au moment du clic.
 */
export async function createAccessLink(userId: string, redirectTo: string = "/dashboard", validityMs: number = VALIDITY_MS) {
  const admin = createAdminClient();
  const token = (randomUUID() + randomUUID()).replace(/-/g, "");
  const expiresAt = new Date(Date.now() + validityMs).toISOString();
  const { error } = await admin
    .from("access_links")
    .insert({ token, user_id: userId, redirect_to: redirectTo, expires_at: expiresAt });
  if (error) return { ok: false as const, url: null, error: error.message };
  return { ok: true as const, url: `${SITE}/acces/${token}`, expiresAt };
}
