"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyPatronnistes } from "@/lib/sur-mesure-notify";
import { MESURE_FIELDS } from "./constants";

export async function placeCustomOrder(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Veuillez vous connecter." };

  const titre = String(formData.get("titre") || "").trim();
  if (!titre) return { ok: false, error: "Décrivez le modèle souhaité." };

  const tissu = String(formData.get("tissu") || "").trim() || null;
  const taille = String(formData.get("taille") || "").trim() || null;
  const note = String(formData.get("note") || "").trim() || null;
  const photo_url = String(formData.get("photo_url") || "").trim() || null;
  const video_url = String(formData.get("video_url") || "").trim() || null;

  const mesures: Record<string, number> = {};
  for (const f of MESURE_FIELDS) {
    const v = formData.get(`m_${f}`);
    if (v != null && String(v).trim() !== "") {
      const n = Number(v);
      if (Number.isFinite(n) && n > 0) mesures[f] = n;
    }
  }

  const admin = createAdminClient();
  const { data: order, error } = await admin.from("patron_custom_orders").insert({
    client_id: user.id,
    titre,
    tissu,
    taille,
    note,
    mesures,
    photo_url,
    video_url,
  }).select("id").single();
  if (error) return { ok: false, error: error.message };

  // Alerte commande : signaler à TOUS les patronnistes (notification in-app).
  await notifyPatronnistes(admin, {
    title: "Nouvelle commande sur mesure",
    body: `« ${titre} » — première patronniste à la prendre la garde. Ouvrez « Sur mesure ».`,
  });

  revalidatePath("/dashboard/sur-mesure");
  revalidatePath("/patronniste/sur-mesure");
  return { ok: true };
}
