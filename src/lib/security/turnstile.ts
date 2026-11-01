/**
 * Cloudflare Turnstile — la case anti-robots. Vérifie le jeton côté serveur.
 * Sans clé secrète configurée, rien n'est bloqué (les autres protections restent).
 */
export async function turnstileValide(jeton: unknown, ip: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true;
  if (typeof jeton !== "string" || !jeton) return false;
  try {
    const corps = new URLSearchParams({ secret, response: jeton, ...(ip && ip !== "unknown" ? { remoteip: ip } : {}) });
    const r = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body: corps });
    const d = (await r.json()) as { success?: boolean };
    return d.success === true;
  } catch {
    return false;
  }
}
