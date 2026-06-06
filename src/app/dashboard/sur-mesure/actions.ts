"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const MESURE_FIELDS = [
  "Tour de poitrine",
  "Tour de taille",
  "Tour de hanches",
  "Tour de bras",
  "Longueur du dos",
  "Largeur d'épaules",
  "Longueur de manche",
  "Hauteur totale",
] as const;

export async function placeCustomOrder(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Veuillez vous connecter." };

  const titre = String(formData.get("titre") || "").trim();
  if (!titre) return { ok: false, error: "Décrivez le modèle souhaité." };

  const tissu = String(formData.get("tissu") || "").trim() || null;
  const taille = String(formData.get("taille") || "").trim() || null;
  const note = String(formData.get("note") || "").trim() || null;

  const mesures: Record<string, number> = {};
  for (const f of MESURE_FIELDS) {
    const v = formData.get(`m_${f}`);
    if (v != null && String(v).trim() !== "") {
      const n = Number(v);
      if (Number.isFinite(n) && n > 0) mesures[f] = n;
    }
  }

  const admin = createAdminClient();
  const { error } = await admin.from("patron_custom_orders").insert({
    client_id: user.id,
    titre,
    tissu,
    taille,
    note,
    mesures,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/sur-mesure");
  return { ok: true };
}
