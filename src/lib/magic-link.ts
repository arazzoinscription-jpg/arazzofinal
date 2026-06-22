import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://www.formation-arazzo.store";

/**
 * Génère un lien de connexion sans mot de passe (magic link) à intégrer dans
 * un email (ex. « Commencer »).
 *
 * Note : `signInWithOtp()` envoie le mail via Supabase mais ne RENVOIE pas le
 * lien — or ici on veut l'intégrer à notre propre email. On utilise donc
 * `admin.generateLink({ type: 'magiclink' })` qui produit le lien sans l'envoyer.
 * Le compte doit déjà exister (créé en amont par l'enrôlement).
 */
export async function createMagicLink(email: string, redirectTo: string = `${SITE}/auth/callback?next=/dashboard`) {
  const admin = createAdminClient();
  try {
    const { data, error } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email,
      options: { redirectTo },
    });
    if (error || !data?.properties?.action_link) return { ok: false as const, link: null, error: error?.message };
    return { ok: true as const, link: data.properties.action_link };
  } catch (e) {
    return { ok: false as const, link: null, error: e instanceof Error ? e.message : "Erreur magic link" };
  }
}

/**
 * Génère un lien permettant à l'élève de DÉFINIR son mot de passe (même email).
 * Type `recovery` : le lien ouvre la page /auth/reset-password (« Créez votre mot
 * de passe ») où l'élève choisit son mot de passe puis accède à son dashboard.
 * Le compte doit déjà exister.
 */
export async function createPasswordSetupLink(email: string, redirectTo: string = `${SITE}/auth/reset-password`) {
  const admin = createAdminClient();
  try {
    const { data, error } = await admin.auth.admin.generateLink({
      type: "recovery",
      email,
      options: { redirectTo },
    });
    if (error || !data?.properties?.action_link) return { ok: false as const, link: null, error: error?.message };
    return { ok: true as const, link: data.properties.action_link };
  } catch (e) {
    return { ok: false as const, link: null, error: e instanceof Error ? e.message : "Erreur lien mot de passe" };
  }
}
