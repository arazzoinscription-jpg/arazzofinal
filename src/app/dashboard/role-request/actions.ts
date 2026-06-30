"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyAdminEmail } from "@/lib/admin-notify";

export async function requestRole(requested: "formateur" | "patronniste", message?: string) {
  if (requested !== "formateur" && requested !== "patronniste") {
    return { ok: false, error: "Rôle invalide" };
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Veuillez vous connecter." };

  const admin = createAdminClient();

  // Déjà une demande en attente pour ce rôle ?
  const { data: existing } = await admin
    .from("role_requests")
    .select("id")
    .eq("user_id", user.id)
    .eq("requested_role", requested)
    .eq("statut", "en_attente")
    .maybeSingle();
  if (existing) return { ok: false, error: "Vous avez déjà une demande en attente pour ce rôle." };

  const { error } = await admin.from("role_requests").insert({
    user_id: user.id,
    requested_role: requested,
    message: message?.trim() || null,
  });
  if (error) return { ok: false, error: error.message };

  const { data: u } = await admin.from("users").select("nom, email").eq("id", user.id).maybeSingle();
  await notifyAdminEmail("🙋 Nouvelle demande de rôle", {
    "Rôle demandé": requested === "formateur" ? "Formateur" : "Patronniste",
    "Utilisateur": u?.nom || "—", "Email": u?.email || user.email || "—",
    "Message": message?.trim() || "—",
  }, { intro: "Un membre demande à devenir formateur/patronniste.", link: "/admin/demandes" });

  revalidatePath("/dashboard");
  return { ok: true };
}
