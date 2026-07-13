"use server";

import { z } from "zod";
import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const BUCKET = "posts";
const IMG_EXT = ["jpg", "jpeg", "png", "webp"];
const VID_EXT = ["mp4", "mov", "webm", "m4v"];
const MAX_IMG = 10 * 1024 * 1024;  // 10 Mo
const MAX_VID = 60 * 1024 * 1024;  // 60 Mo

async function me() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

/** Prépare une URL d'upload signée pour un média du projet de fin de stage. */
export async function createProjectUploadUrl(ext: string) {
  const user = await me();
  if (!user) return { ok: false as const, error: "Non authentifié." };
  const clean = (ext || "").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5);
  const isImg = IMG_EXT.includes(clean);
  const isVid = VID_EXT.includes(clean);
  if (!isImg && !isVid) return { ok: false as const, error: "Format non supporté (image ou vidéo)." };

  const admin = createAdminClient();
  const path = `projects/${user.id}/${randomUUID()}.${clean}`;
  const { data, error } = await admin.storage.from(BUCKET).createSignedUploadUrl(path);
  if (error || !data) return { ok: false as const, error: "Préparation de l'envoi impossible." };
  return { ok: true as const, path: data.path, token: data.token, kind: (isVid ? "video" : "image") as "image" | "video" };
}

/** Enregistre un média du projet après upload et renvoie son URL publique. */
export async function recordProjectMedia(path: string, kind: "image" | "video", size: number) {
  const user = await me();
  if (!user) return { ok: false as const, error: "Non authentifié." };
  if (!["image", "video"].includes(kind)) return { ok: false as const, error: "Type invalide." };
  if (typeof path !== "string" || !path.startsWith(`projects/${user.id}/`)) return { ok: false as const, error: "Chemin invalide." };
  if (typeof size !== "number" || size > (kind === "video" ? MAX_VID : MAX_IMG)) {
    return { ok: false as const, error: kind === "video" ? "Vidéo trop lourde (max 60 Mo)." : "Image trop lourde (max 10 Mo)." };
  }

  const admin = createAdminClient();
  const url = admin.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  const { error } = await admin.from("final_project_media").insert({
    user_id: user.id, kind, url, path, status: "submitted",
  });
  if (error) {
    const msg = /final_project_media/.test(error.message)
      ? "Migration 075 non appliquée — lancez 075_final_project.sql dans Supabase."
      : error.message;
    return { ok: false as const, error: msg };
  }
  revalidatePath("/dashboard/projet");
  return { ok: true as const, url };
}

export interface ProjectMedia { id: string; kind: "image" | "video"; url: string; createdAt: string }

/** Médias déjà envoyés par l'étudiante (pour affichage). Résilient si table absente. */
export async function listMyProjectMedia(userId: string): Promise<ProjectMedia[]> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("final_project_media")
      .select("id, kind, url, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    return (data ?? []).map((m: any) => ({ id: m.id, kind: m.kind, url: m.url, createdAt: m.created_at }));
  } catch { return []; }
}

/** Supprime un média du projet (le sien uniquement). */
export async function deleteProjectMedia(id: string) {
  const user = await me();
  if (!user) return { ok: false as const, error: "Non authentifié." };
  if (!z.string().uuid().safeParse(id).success) return { ok: false as const, error: "Identifiant invalide." };
  const admin = createAdminClient();
  const { data: row } = await admin.from("final_project_media").select("path, user_id").eq("id", id).maybeSingle();
  if (!row || (row as { user_id?: string }).user_id !== user.id) return { ok: false as const, error: "Accès refusé." };
  await admin.storage.from(BUCKET).remove([(row as { path: string }).path]).catch(() => {});
  await admin.from("final_project_media").delete().eq("id", id);
  revalidatePath("/dashboard/projet");
  return { ok: true as const };
}
