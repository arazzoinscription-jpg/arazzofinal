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
    {
      auth: { persistSession: false, autoRefreshToken: false },
      // 09/11 : jamais de copie gardée par Next (cache des fetch) — sinon un groupe fermé dans l'OS
      // restait « ouvert » pour /api/groupes-ouverts et les Stories des groupes.
      global: { fetch: (input: RequestInfo | URL, init?: RequestInit) => fetch(input, { ...init, cache: "no-store" }) },
    }
  );
}
