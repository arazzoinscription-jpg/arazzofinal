"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isPushConfigured, sendPushToUsers } from "@/lib/push";

/**
 * « Tester ma sonnerie » : l'élève s'envoie à ELLE-MÊME (à ses seuls téléphones) une notification de cloche,
 * pour vérifier que son téléphone sonne — tout de suite, ou après quelques secondes (écran verrouillé).
 * Aucune notification enregistrée, personne d'autre n'est prévenu. Un essai toutes les 20 secondes au plus.
 */

const DERNIER = new Map<string, number>();
const PAUSE_MS = 20_000;

export async function testerMaCloche(entree: { delai?: unknown } = {}): Promise<{ ok: true; telephones: number } | { ok: false; erreur: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, erreur: "Connectez-vous pour tester la sonnerie." };
  if (!isPushConfigured()) return { ok: false, erreur: "Les notifications ne sont pas disponibles sur ce serveur." };
  const avant = DERNIER.get(user.id) ?? 0;
  if (Date.now() - avant < PAUSE_MS) return { ok: false, erreur: "Patientez quelques secondes avant un nouvel essai." };
  DERNIER.set(user.id, Date.now());

  const admin = createAdminClient();
  const { count } = await admin.from("push_subscriptions").select("id", { count: "exact", head: true }).eq("user_id", user.id);
  if (!count) return { ok: false, erreur: "Activez d'abord la sonnerie sur ce téléphone." };

  // Essai « écran verrouillé » : quelques secondes pour verrouiller le téléphone ou changer d'application.
  const delai = entree.delai === 8 ? 8 : 0;
  if (delai) await new Promise((r) => setTimeout(r, delai * 1000));
  await sendPushToUsers(admin, [user.id], {
    title: "🔔 Test de la cloche",
    body: "Votre téléphone sonnera comme ceci quand votre enseignante fera sonner la cloche.",
    url: `/dashboard/classe?cloche=${Date.now()}`,
    tag: "cloche",
    silent: false,
  });
  return { ok: true, telephones: count };
}
