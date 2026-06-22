/** Validation des variables d'environnement au démarrage (server-only). */

const REQUIRED = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
] as const;

// Optionnelles : l'app fonctionne sans, mais certaines fonctions sont désactivées.
const OPTIONAL = [
  "RESEND_API_KEY", "RESEND_FROM",
  "CHARGILY_API_KEY", "CHARGILY_ENDPOINT",
  "STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET",
  "BUNNY_API_KEY", "BUNNY_LIBRARY_ID",
  "UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN",
  "VIRUSTOTAL_API_KEY",
  "NEXT_PUBLIC_SITE_URL",
] as const;

let validated = false;

/** Vérifie la présence des variables critiques. Lève en production, avertit en dev. */
export function validateEnv(): void {
  if (validated) return;
  validated = true;
  const missing = REQUIRED.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    const msg = `Variables d'environnement manquantes : ${missing.join(", ")}`;
    if (process.env.NODE_ENV === "production") throw new Error(msg);
    console.warn(`[env] ${msg}`);
  }
  if (process.env.NODE_ENV !== "production") {
    const missingOpt = OPTIONAL.filter((k) => !process.env[k]);
    if (missingOpt.length) console.warn(`[env] Optionnelles absentes (fonctions limitées) : ${missingOpt.join(", ")}`);
  }
}

/** Récupère une variable obligatoire ou lève. */
export function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}
