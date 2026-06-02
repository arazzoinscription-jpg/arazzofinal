import { createClient } from "@supabase/supabase-js";

/**
 * Client Supabase avec la clé service-role, SANS cookies.
 * Utilisable dans n'importe quel contexte serveur : Server Actions,
 * Route Handlers, webhooks, et jobs cron (où il n'y a pas de requête).
 * ⚠️ À n'utiliser que côté serveur — ne jamais exposer au client.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}
