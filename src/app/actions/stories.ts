"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/roles";
import { bunnyPlaybackUrls, bunnyTusAuth, createBunnyVideo, isBunnyConfigured } from "@/lib/bunny/stream";
import { VIE_STORY_MS, lireLegende, verifierDureeStory, verifierPhotoStory } from "@/lib/stories/regles";
import { etatMigrationStories } from "@/lib/stories/load";

/**
 * Stories : élèves ET enseignantes, connectées. Photo (stockage « posts », dossier stories/) ou
 * vidéo de 30 s au plus (Bunny Stream). Visibles 24 h. Chacune supprime les siennes ; l'administration
 * peut supprimer n'importe quelle story (modération).
 */

const INDISPONIBLE = "Les stories ne sont pas encore activées sur ce site (migration 099 à appliquer).";

async function connectee() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function publierStoryPhoto(fd: FormData): Promise<{ ok: true } | { ok: false; erreur: string }> {
  const user = await connectee();
  if (!user) return { ok: false, erreur: "Connectez-vous pour publier une story." };
  const f = fd.get("photo");
  if (!(f instanceof File)) return { ok: false, erreur: "Choisissez une photo." };
  const pb = verifierPhotoStory({ type: f.type, size: f.size });
  if (pb) return { ok: false, erreur: pb };
  const admin = createAdminClient();
  if (await etatMigrationStories(admin)) return { ok: false, erreur: INDISPONIBLE };

  const ext = (f.type.split("/")[1] || "jpg").replace("jpeg", "jpg");
  const chemin = `stories/${user.id}/${randomUUID()}.${ext}`;
  const up = await admin.storage.from("posts").upload(chemin, Buffer.from(await f.arrayBuffer()), { contentType: f.type, upsert: false });
  if (up.error) return { ok: false, erreur: "Envoi de la photo impossible, réessayez." };
  const { data: pub } = admin.storage.from("posts").getPublicUrl(chemin);
  const ins = await admin.from("stories").insert({
    user_id: user.id, media_kind: "image", media_url: pub.publicUrl, storage_path: chemin, legende: lireLegende(fd.get("legende")),
    expires_at: new Date(Date.now() + VIE_STORY_MS).toISOString(),
  });
  if (ins.error) {
    await admin.storage.from("posts").remove([chemin]);
    return { ok: false, erreur: ins.error.message };
  }
  revalidatePath("/dashboard/classe");
  return { ok: true };
}

export async function demarrerStoryVideo(): Promise<
  { ok: true; videoId: string; tus: ReturnType<typeof bunnyTusAuth> } | { ok: false; erreur: string }> {
  const user = await connectee();
  if (!user) return { ok: false, erreur: "Connectez-vous pour publier une story." };
  if (!isBunnyConfigured()) return { ok: false, erreur: "Les vidéos ne sont pas disponibles sur ce serveur : publiez une photo." };
  if (await etatMigrationStories(createAdminClient())) return { ok: false, erreur: INDISPONIBLE };
  const v = await createBunnyVideo(`Story ${user.id.slice(0, 8)}`);
  if (!v.ok) return { ok: false, erreur: v.error };
  return { ok: true, videoId: v.videoId, tus: bunnyTusAuth(v.videoId) };
}

export async function finaliserStoryVideo(entree: { videoId: unknown; duree: unknown; legende: unknown }): Promise<{ ok: true } | { ok: false; erreur: string }> {
  const user = await connectee();
  if (!user) return { ok: false, erreur: "Connectez-vous pour publier une story." };
  if (typeof entree.videoId !== "string" || !/^[0-9a-f-]{8,64}$/i.test(entree.videoId)) return { ok: false, erreur: "Vidéo invalide." };
  const d = verifierDureeStory(entree.duree);
  if (!d.ok) return { ok: false, erreur: d.erreur };
  const admin = createAdminClient();
  const ins = await admin.from("stories").insert({
    user_id: user.id, media_kind: "video", bunny_video_id: entree.videoId, thumbnail_url: bunnyPlaybackUrls(entree.videoId).thumbnail,
    duration_seconds: d.duree, legende: lireLegende(entree.legende),
    expires_at: new Date(Date.now() + VIE_STORY_MS).toISOString(),
  });
  if (ins.error) return { ok: false, erreur: ins.error.message };
  revalidatePath("/dashboard/classe");
  return { ok: true };
}

export async function supprimerStory(id: unknown): Promise<{ ok: true } | { ok: false; erreur: string }> {
  const user = await connectee();
  if (!user) return { ok: false, erreur: "Non connectée." };
  if (typeof id !== "string" || !/^[0-9a-f-]{36}$/i.test(id)) return { ok: false, erreur: "Story invalide." };
  const admin = createAdminClient();
  const { data: s } = await admin.from("stories").select("user_id, storage_path").eq("id", id).maybeSingle();
  if (!s) return { ok: false, erreur: "Story introuvable." };
  if (s.user_id !== user.id) {
    const { data: prof } = await admin.from("users").select("role, roles").eq("id", user.id).maybeSingle();
    if (!isAdmin(prof)) return { ok: false, erreur: "Vous ne pouvez supprimer que vos stories." };
  }
  const del = await admin.from("stories").delete().eq("id", id);
  if (del.error) return { ok: false, erreur: del.error.message };
  if (s.storage_path) await admin.storage.from("posts").remove([s.storage_path as string]);
  return { ok: true };
}
