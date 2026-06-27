"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyPatronnistes } from "@/lib/sur-mesure-notify";
import { createBunnyVideo, bunnyTusAuth, isBunnyConfigured, FEED_LIBRARY_ID } from "@/lib/bunny/stream";
import { MESURE_FIELDS } from "./constants";

/**
 * Démarre l'upload de la vidéo du modèle vers Bunny Stream (TUS résumable côté
 * navigateur — le fichier ne transite pas par notre serveur, donc pas de limite 4,5 Mo).
 * Accessible à toute cliente connectée qui passe une commande sur mesure.
 */
export async function startSurMesureVideo(title: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Veuillez vous connecter." };
  if (!isBunnyConfigured()) return { ok: false as const, error: "Service vidéo non configuré." };
  const created = await createBunnyVideo(title?.slice(0, 120) || "Modèle sur mesure");
  if (!created.ok) return { ok: false as const, error: created.error };
  const tus = bunnyTusAuth(created.videoId);
  const embedUrl = `https://iframe.mediadelivery.net/embed/${FEED_LIBRARY_ID}/${created.videoId}`;
  return { ok: true as const, videoId: created.videoId, embedUrl, tus };
}

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
