"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sanitizeText } from "@/lib/security/sanitize";

const MAX_AVATAR = 3 * 1024 * 1024; // 3 Mo
const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;

/**
 * Met à jour le profil communauté de l'utilisateur connecté :
 * avatar (upload image), @username (unique, insensible à la casse), bio.
 * FormData : username, bio, avatar? (File image).
 */
export async function updateCommunityProfile(formData: FormData) {
  try {
    return await doUpdate(formData);
  } catch (e) {
    // Filet de sécurité : aucune exception ne doit faire planter la page (digest).
    return { ok: false as const, error: "Échec de la mise à jour : " + ((e as Error)?.message ?? "erreur inconnue") };
  }
}

async function doUpdate(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Non authentifié." };

  const admin = createAdminClient();

  // ── Username (optionnel) ──
  const rawUsername = String(formData.get("username") ?? "").trim().replace(/^@/, "");
  let username: string | null = null;
  if (rawUsername.length > 0) {
    if (!USERNAME_RE.test(rawUsername)) {
      return { ok: false as const, error: "Nom d'utilisateur : 3 à 20 caractères (lettres, chiffres, _)." };
    }
    const { data: clash } = await admin
      .from("users").select("id").ilike("username", rawUsername).neq("id", user.id).maybeSingle();
    if (clash) return { ok: false as const, error: "Ce nom d'utilisateur est déjà pris." };
    username = rawUsername;
  }

  // ── Bio ──
  const bio = sanitizeText(String(formData.get("bio") ?? "")).slice(0, 200) || null;

  // ── Avatar (optionnel) ──
  let avatarUrl: string | undefined;
  const avatar = formData.get("avatar");
  if (avatar instanceof File && avatar.size > 0) {
    if (!avatar.type.startsWith("image/")) return { ok: false as const, error: "L'avatar doit être une image." };
    if (avatar.size > MAX_AVATAR) return { ok: false as const, error: "Image trop lourde (max 3 Mo)." };
    const ext = (avatar.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5) || "jpg";
    const path = `avatars/${user.id}/${randomUUID()}.${ext}`;
    const bytes = new Uint8Array(await avatar.arrayBuffer());
    const { error: upErr } = await admin.storage.from("posts").upload(path, bytes, { contentType: avatar.type, upsert: false });
    if (upErr) return { ok: false as const, error: "Envoi de l'avatar échoué : " + upErr.message };
    avatarUrl = admin.storage.from("posts").getPublicUrl(path).data.publicUrl;
  }

  // ── Mise à jour ──
  const patch: Record<string, unknown> = { username, bio };
  if (avatarUrl) patch.avatar_url = avatarUrl;

  const { error } = await admin.from("users").update(patch).eq("id", user.id);
  if (error) {
    if ((error.message || "").toLowerCase().includes("unique") || (error as any).code === "23505") {
      return { ok: false as const, error: "Ce nom d'utilisateur est déjà pris." };
    }
    return { ok: false as const, error: error.message };
  }

  revalidatePath(`/communaute/u/${user.id}`);
  revalidatePath("/communaute/profil");
  return { ok: true as const, avatarUrl };
}
