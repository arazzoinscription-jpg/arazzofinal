"use server";

import { z } from "zod";
import { randomUUID } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const PROOFS_BUCKET = "proofs";
const MAX_PROOF = 10 * 1024 * 1024; // 10 Mo
const EXT_OK = ["jpg", "jpeg", "png", "pdf"];

async function currentUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

/**
 * Un étudiant est « importé » (déjà payé sur Telegram) s'il a au moins une
 * inscription à 0 DA (migrée depuis l'ancien système). Renvoie aussi s'il a
 * déjà téléversé sa preuve Telegram → sert à décider l'affichage du popup.
 */
export async function getTelegramProofState(userId: string): Promise<{ isImported: boolean; hasProof: boolean }> {
  const admin = createAdminClient();
  const { data: freeEnroll } = await admin
    .from("enrollments").select("id").eq("user_id", userId).eq("amount", 0).limit(1);
  const isImported = (freeEnroll?.length ?? 0) > 0;
  if (!isImported) return { isImported: false, hasProof: false };
  let hasProof = false;
  try {
    const { data } = await admin
      .from("telegram_payment_proofs").select("id").eq("user_id", userId).limit(1);
    hasProof = (data?.length ?? 0) > 0;
  } catch { /* table absente (migration 070 non appliquée) → traiter comme sans preuve */ }
  return { isImported, hasProof };
}

/** Prépare l'URL d'upload signée pour la preuve Telegram de l'utilisateur connecté. */
export async function createTelegramProofUploadUrl(ext: string) {
  const user = await currentUser();
  if (!user) return { ok: false as const, error: "Non authentifié." };
  const cleanExt = (ext || "").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5);
  if (!EXT_OK.includes(cleanExt)) return { ok: false as const, error: "Format non supporté (JPG, PNG, PDF)." };

  const admin = createAdminClient();
  const path = `telegram/${user.id}/${randomUUID()}.${cleanExt}`;
  const { data, error } = await admin.storage.from(PROOFS_BUCKET).createSignedUploadUrl(path);
  if (error || !data) return { ok: false as const, error: "Préparation de l'envoi impossible." };
  return { ok: true as const, path: data.path, token: data.token };
}

/** Enregistre la preuve Telegram après upload (remplace toute preuve précédente). */
export async function recordTelegramProof(path: string, ext: string, size: number, note?: string) {
  const user = await currentUser();
  if (!user) return { ok: false as const, error: "Non authentifié." };

  const cleanExt = (ext || "").toLowerCase();
  if (!EXT_OK.includes(cleanExt)) return { ok: false as const, error: "Format non supporté." };
  if (typeof path !== "string" || !path.startsWith(`telegram/${user.id}/`)) {
    return { ok: false as const, error: "Chemin invalide." };
  }
  if (typeof size !== "number" || size > MAX_PROOF) return { ok: false as const, error: "Fichier trop lourd (max 10 Mo)." };

  const admin = createAdminClient();
  const noteOk = z.string().max(500).optional().safeParse(note);
  const { error } = await admin
    .from("telegram_payment_proofs")
    .upsert(
      {
        user_id: user.id,
        file_path: path,
        file_type: cleanExt === "jpeg" ? "jpg" : cleanExt,
        note: noteOk.success ? (noteOk.data ?? null) : null,
        status: "received",
        created_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
  if (error) {
    const msg = /telegram_payment_proofs/.test(error.message)
      ? "Migration 070 non appliquée (table manquante) — lancez 070_telegram_payment_proofs.sql dans Supabase."
      : error.message;
    return { ok: false as const, error: msg };
  }
  return { ok: true as const };
}

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Non authentifié." };
  const { data: prof } = await supabase.from("users").select("role").eq("id", user.id).single();
  if (prof?.role !== "admin") return { ok: false as const, error: "Accès refusé." };
  return { ok: true as const };
}

/** Admin : marque une preuve Telegram comme vérifiée ou rejetée. */
export async function setTelegramProofStatus(id: string, status: "verified" | "rejected" | "received") {
  const auth = await requireAdmin();
  if (!auth.ok) return auth;
  if (!["verified", "rejected", "received"].includes(status)) return { ok: false as const, error: "Statut invalide." };
  const admin = createAdminClient();
  const { error } = await admin.from("telegram_payment_proofs").update({ status }).eq("id", id);
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const };
}

/** Admin : URL signée pour consulter le fichier d'une preuve Telegram. */
export async function getTelegramProofSignedUrl(id: string) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth;
  const admin = createAdminClient();
  const { data: row } = await admin
    .from("telegram_payment_proofs").select("file_path").eq("id", id).maybeSingle();
  if (!row?.file_path) return { ok: false as const, error: "Preuve introuvable." };
  const { data, error } = await admin.storage.from(PROOFS_BUCKET).createSignedUrl(row.file_path, 60 * 10);
  if (error || !data) return { ok: false as const, error: "Lien indisponible." };
  return { ok: true as const, url: data.signedUrl };
}
