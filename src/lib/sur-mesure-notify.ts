import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Crée une notification in-app pour chaque patronniste (+ admin) — alerte commande sur mesure. */
export async function notifyPatronnistes(admin: SupabaseClient, n: { title: string; body: string }) {
  const { data: pros } = await admin.from("users").select("id").in("role", ["patronniste", "admin"]);
  if (!pros?.length) return;
  const rows = pros.map((p: { id: string }) => ({
    user_id: p.id,
    type: "system",
    title: n.title,
    body: n.body,
    link: "/patronniste/sur-mesure",
  }));
  await admin.from("notifications").insert(rows);
}

/** Notifie un utilisateur précis (ex. le client d'une commande sur mesure). */
export async function notifyUser(
  admin: SupabaseClient,
  userId: string,
  n: { title: string; body: string; link?: string },
) {
  if (!userId) return;
  await admin.from("notifications").insert({
    user_id: userId, type: "system", title: n.title, body: n.body, link: n.link ?? "/dashboard/sur-mesure",
  });
}

/** Notifie tous les administrateurs (ex. demande de prix / preuve de paiement à valider). */
export async function notifyAdmins(admin: SupabaseClient, n: { title: string; body: string; link?: string }) {
  const { data: admins } = await admin.from("users").select("id").eq("role", "admin");
  if (!admins?.length) return;
  const rows = admins.map((a: { id: string }) => ({
    user_id: a.id, type: "system", title: n.title, body: n.body, link: n.link ?? "/admin/sur-mesure",
  }));
  await admin.from("notifications").insert(rows);
}
