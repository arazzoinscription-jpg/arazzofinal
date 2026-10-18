import "server-only";
import { cache } from "react";
import { createClient } from "./server";

/**
 * L'utilisatrice connectée — vérifiée UNE seule fois par requête : le gabarit et la page (tableau de bord) la
 * partagent au lieu d'interroger chacun le service de connexion (un aller-retour réseau de moins à chaque page).
 */
export const utilisatriceCourante = cache(async () => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
});
