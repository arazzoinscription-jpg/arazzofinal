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
