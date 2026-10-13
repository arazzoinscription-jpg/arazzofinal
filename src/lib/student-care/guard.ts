import "server-only";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/roles";

/**
 * L'utilisatrice connectée est-elle administratrice ?
 *
 * Le layout `/admin` le vérifie déjà, mais un layout n'est pas rejoué à chaque
 * navigation : la page, la fiche détaillée et chaque action serveur du suivi
 * refont donc la vérification elles-mêmes (défense en profondeur).
 */
export async function adminConnecte(): Promise<{ userId: string } | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profil } = await supabase.from("users").select("role, roles").eq("id", user.id).maybeSingle();
  return isAdmin(profil) ? { userId: user.id } : null;
}
