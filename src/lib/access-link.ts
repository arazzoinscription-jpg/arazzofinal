import "server-only";
import { randomUUID } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { brandedSiteUrl } from "@/lib/site-url";

const SITE = brandedSiteUrl();
const VALIDITY_MS = 48 * 60 * 60 * 1000; // 48 heures

/**
 * Crée un lien d'accès bran+dé (domaine Arazzo) valable 48h.
 * Renvoie une URL du type https://www.formation-arazzo.store/acces/<token>.
 * La route /acces/<token> génère un lien Supabase frais au moment du clic.
 */
export async function createAccessLink(userId: string, redirectTo: string = "/dashboard") {
  const admin = createAdminClient();
  const token = (randomUUID() + randomUUID()).replace(/-/g, "");
  const expiresAt = new Date(Date.now() + VALIDITY_MS).toISOString();
  const { error } = await admin
    .from("access_links")
    .insert({ token, user_id: userId, redirect_to: redirectTo, expires_at: expiresAt });
  if (error) return { ok: false as const, url: null, error: error.message };
  return { ok: true as const, url: `${SITE}/acces/${token}`, expiresAt };
}
