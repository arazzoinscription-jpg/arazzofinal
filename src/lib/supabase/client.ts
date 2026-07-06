import { createBrowserClient } from "@supabase/ssr";

// Session persistante « à la Instagram » : l'utilisateur ne se déconnecte JAMAIS
// tout seul, seulement manuellement. Les cookies de session sont conservés 400
// jours (maximum autorisé par les navigateurs) et le jeton d'accès est rafraîchi
// automatiquement à chaque ouverture → aucune expiration silencieuse.
export const SESSION_MAX_AGE = 60 * 60 * 24 * 400; // 400 jours

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookieOptions: { maxAge: SESSION_MAX_AGE } }
  );
}
