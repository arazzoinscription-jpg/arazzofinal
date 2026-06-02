import { createClient } from "@supabase/supabase-js";

/**
 * Client Supabase ANON, SANS cookies.
 * Pour les pages publiques mises en cache (ISR) : pas de dépendance à la
 * session → Next.js peut rendre statiquement et revalider périodiquement.
 * Ne lit que des données publiques (cours publiés via RLS).
 */
export function createPublicClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}
