import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getRoles } from "@/lib/roles";
import { statutPublication } from "./regles";
import { MIGRATION_103, estInscrite, migration103 } from "./load";

/**
 * B. — La publication d'une visiteuse (compte sans formation) attend la validation de l'équipe.
 * Sans la migration 103, une visiteuse ne peut pas encore publier (A seul) : on le dit clairement.
 */
export async function statutPourAuteur(admin: SupabaseClient, userId: string):
  Promise<{ ok: true; inscrite: boolean; published: boolean; a_valider: boolean } | { ok: false; erreur: string }> {
  const inscrite = await estInscrite(admin, userId);
  if (inscrite) return { ok: true, inscrite, ...statutPublication(true) };
  if (!(await migration103(admin))) return { ok: false, erreur: `Publier sera possible pour les comptes sans formation après validation de l'équipe. ${MIGRATION_103}` };
  return { ok: true, inscrite, ...statutPublication(false) };
}

/** Prévient l'administration (notification dans le site, jamais d'e-mail) qu'une publication attend. */
export async function signalerAValider(admin: SupabaseClient, quoi: string): Promise<void> {
  try {
    const { data } = await admin.from("users").select("id, role, roles").or("role.eq.admin,roles.cs.{admin}").limit(20);
    const ids = ((data ?? []) as { id: string; role: string | null; roles: string[] | null }[]).filter((p) => getRoles(p).includes("admin")).map((p) => p.id);
    if (!ids.length) return;
    await admin.from("notifications").insert(ids.map((user_id) => ({
      user_id, type: "moderation", title: "🕒 Une publication attend votre validation", body: quoi, link: "/admin/communaute#a-valider",
    })));
  } catch { /* la publication reste en attente, visible dans « À valider » */ }
}
