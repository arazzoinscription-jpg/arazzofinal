import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { sendPushToUsers } from "@/lib/push";

/** Crée une notification in-app pour chaque patronniste (+ admin) — alerte commande sur mesure. */
export async function notifyPatronnistes(admin: SupabaseClient, n: { title: string; body: string }) {
  // Cible l'ENSEMBLE des rôles : inclut les comptes qui cumulent patronniste + un autre espace.
  const { data: pros } = await admin.from("users").select("id").overlaps("roles", ["patronniste", "admin"]);
  if (!pros?.length) return;
  const ids = pros.map((p: { id: string }) => p.id);
  const link = "/patronniste/sur-mesure";
  await admin.from("notifications").insert(
    ids.map((id) => ({ user_id: id, type: "system", title: n.title, body: n.body, link })),
  );
  await sendPushToUsers(admin, ids, { title: n.title, body: n.body, url: link, tag: "sur-mesure" });
}

/** Notifie un utilisateur précis (ex. le client d'une commande sur mesure). */
export async function notifyUser(
  admin: SupabaseClient,
  userId: string,
  n: { title: string; body: string; link?: string },
) {
  if (!userId) return;
  const link = n.link ?? "/dashboard/sur-mesure";
  await admin.from("notifications").insert({
    user_id: userId, type: "system", title: n.title, body: n.body, link,
  });
  await sendPushToUsers(admin, [userId], { title: n.title, body: n.body, url: link });
}

/** Notifie tous les administrateurs (ex. demande de prix / preuve de paiement à valider). */
export async function notifyAdmins(admin: SupabaseClient, n: { title: string; body: string; link?: string }) {
  const { data: admins } = await admin.from("users").select("id").eq("role", "admin");
  if (!admins?.length) return;
  const ids = admins.map((a: { id: string }) => a.id);
  const link = n.link ?? "/admin/sur-mesure";
  await admin.from("notifications").insert(
    ids.map((id) => ({ user_id: id, type: "system", title: n.title, body: n.body, link })),
  );
  await sendPushToUsers(admin, ids, { title: n.title, body: n.body, url: link });
}
