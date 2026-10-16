import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin, isFormateur } from "@/lib/roles";
import { adminConnecte } from "@/lib/student-care/guard";
import type { Base, Espace } from "./portee";

export * from "./portee";

/** Espace « administration » : toutes les élèves. null si la personne n'est pas administratrice. */
export async function espaceAdmin(): Promise<Espace | null> {
  const moi = await adminConnecte();
  return moi ? { base: "/admin", userId: moi.userId, estAdmin: true, cours: null } : null;
}

/**
 * Espace « formatrice » : seulement ses cours. Une administratrice qui passe par l'espace
 * formatrice garde la vue complète. null si la personne n'est ni formatrice ni admin.
 * Vérifié à CHAQUE page et CHAQUE action (un layout n'est pas rejoué à chaque navigation).
 */
export async function espaceFormatrice(): Promise<Espace | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profil } = await supabase.from("users").select("role, roles").eq("id", user.id).maybeSingle();
  if (!isFormateur(profil)) return null;
  if (isAdmin(profil)) return { base: "/formateur", userId: user.id, estAdmin: true, cours: null };
  const { data: cours, error } = await createAdminClient().from("courses").select("id").eq("formateur_id", user.id);
  if (error) throw new Error(`Cours de la formatrice illisibles : ${error.message}`);
  return { base: "/formateur", userId: user.id, estAdmin: false, cours: new Set((cours ?? []).map((c: { id: string }) => c.id)) };
}

/** Pour une action serveur : l'espace demandé par le formulaire, vérifié pour la personne connectée. */
export function espacePour(base: Base): Promise<Espace | null> {
  return base === "/formateur" ? espaceFormatrice() : espaceAdmin();
}

/**
 * Espace d'une personne désignée (sans session) — pour un envoi PROGRAMMÉ qui doit garder les droits
 * de son autrice (ex. cloche de classe). null si elle n'est plus ni formatrice ni administratrice.
 */
export async function espaceDeCompte(userId: string): Promise<Espace | null> {
  const admin = createAdminClient();
  const { data: profil } = await admin.from("users").select("role, roles").eq("id", userId).maybeSingle();
  if (!isFormateur(profil)) return null;
  if (isAdmin(profil)) return { base: "/admin", userId, estAdmin: true, cours: null };
  const { data: cours, error } = await admin.from("courses").select("id").eq("formateur_id", userId);
  if (error) throw new Error(`Cours de la formatrice illisibles : ${error.message}`);
  return { base: "/formateur", userId, estAdmin: false, cours: new Set((cours ?? []).map((c: { id: string }) => c.id)) };
}
