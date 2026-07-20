"use server";

import { z } from "zod";
import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
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

const DEADLINE_DAYS = 7;

/**
 * Un étudiant est « importé » (déjà payé sur Telegram) s'il a au moins une
 * inscription à 0 DA (migrée depuis l'ancien système). Renvoie aussi s'il a
 * déjà téléversé sa preuve Telegram, et si son compte doit être BLOQUÉ (plus de
 * 7 jours après le premier rappel, sans preuve). Le premier rappel est
 * horodaté automatiquement (telegram_notified_at) à la première visite.
 */
export async function getTelegramProofState(userId: string): Promise<{ isImported: boolean; hasProof: boolean; blocked: boolean }> {
  const admin = createAdminClient();
  const { data: freeEnroll } = await admin
    .from("enrollments").select("id").eq("user_id", userId).eq("amount", 0).limit(1);
  const isImported = (freeEnroll?.length ?? 0) > 0;
  if (!isImported) return { isImported: false, hasProof: false, blocked: false };

  let hasProof = false;
  try {
    const { data } = await admin
      .from("telegram_payment_proofs").select("id").eq("user_id", userId).limit(1);
    hasProof = (data?.length ?? 0) > 0;
  } catch { /* table absente (migration 070 non appliquée) → traiter comme sans preuve */ }
  if (hasProof) return { isImported, hasProof, blocked: false };

  // Délai de 7 jours à partir du premier rappel (posé maintenant s'il est absent).
  let blocked = false;
  try {
    const { data: u } = await admin
      .from("users").select("telegram_notified_at").eq("id", userId).maybeSingle();
    let notifiedAt = (u as { telegram_notified_at?: string | null } | null)?.telegram_notified_at ?? null;
    if (!notifiedAt) {
      notifiedAt = new Date().toISOString();
      await admin.from("users").update({ telegram_notified_at: notifiedAt }).eq("id", userId);
    }
    const deadline = new Date(notifiedAt).getTime() + DEADLINE_DAYS * 24 * 60 * 60 * 1000;
    blocked = Date.now() >= deadline;
  } catch { /* colonne absente (migration 072 non appliquée) → pas de blocage */ }

  return { isImported, hasProof, blocked };
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

/**
 * Enregistre la preuve Telegram après upload (remplace toute preuve précédente).
 * `paymentType` : "total" (une seule photo) ou "abonnement" (plusieurs photos).
 * `paths` : tous les fichiers déjà téléversés (1 pour total, N pour abonnement).
 */
export async function recordTelegramProof(paths: string[], paymentType: "total" | "abonnement", note?: string) {
  const user = await currentUser();
  if (!user) return { ok: false as const, error: "Non authentifié." };

  if (!["total", "abonnement"].includes(paymentType)) return { ok: false as const, error: "Type de paiement invalide." };
  if (!Array.isArray(paths) || paths.length === 0) return { ok: false as const, error: "Aucune photo envoyée." };
  if (paths.length > 20) return { ok: false as const, error: "Trop de photos (max 20)." };
  const prefix = `telegram/${user.id}/`;
  if (!paths.every((p) => typeof p === "string" && p.startsWith(prefix))) {
    return { ok: false as const, error: "Chemin invalide." };
  }

  const admin = createAdminClient();
  const noteOk = z.string().max(500).optional().safeParse(note);
  const first = paths[0];
  const fileType = (first.split(".").pop() ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const { error } = await admin
    .from("telegram_payment_proofs")
    .upsert(
      {
        user_id: user.id,
        file_path: first,               // compat migration 070
        file_paths: paths,              // toutes les photos (migration 071)
        payment_type: paymentType,
        file_type: fileType === "jpeg" ? "jpg" : fileType || null,
        note: noteOk.success ? (noteOk.data ?? null) : null,
        status: "received",
        created_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
  if (error) {
    const msg = /file_paths|payment_type/.test(error.message)
      ? "Migration 071 non appliquée — lancez 071_telegram_proof_payment_type.sql dans Supabase."
      : /telegram_payment_proofs/.test(error.message)
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

/**
 * Admin : (ré)ouvre le délai d'envoi de preuve Telegram pour un ou plusieurs
 * élèves. Remet le compteur à AUJOURD'HUI → l'élève repart pour 7 jours pleins
 * et son compte est débloqué immédiatement s'il l'était faute de preuve.
 * Sert à la fois à « réactiver un compte bloqué par manque de preuve » et à
 * « prolonger le délai d'attente ».
 */
export async function extendTelegramProofDeadline(userIds: string[]) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth;
  const ids = z.array(z.string().uuid()).min(1).max(500).safeParse(userIds);
  if (!ids.success) return { ok: false as const, error: "Données invalides." };

  const admin = createAdminClient();
  const list = [...new Set(ids.data)];
  const { error } = await admin
    .from("users")
    .update({ telegram_notified_at: new Date().toISOString() })
    .in("id", list);
  if (error) {
    const msg = /telegram_notified_at/.test(error.message)
      ? "Migration 072 non appliquée — lancez 072_telegram_proof_deadline.sql dans Supabase."
      : error.message;
    return { ok: false as const, error: msg };
  }
  revalidatePath("/admin/etudiants");
  return { ok: true as const, count: list.length };
}

/** Admin : URLs signées de TOUTES les photos d'une preuve Telegram. */
export async function getTelegramProofUrls(id: string) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth;
  const admin = createAdminClient();
  const { data: row } = await admin
    .from("telegram_payment_proofs").select("file_path, file_paths").eq("id", id).maybeSingle();
  const paths: string[] = (row as { file_paths?: string[] } | null)?.file_paths?.length
    ? (row as { file_paths: string[] }).file_paths
    : row?.file_path ? [row.file_path] : [];
  if (!paths.length) return { ok: false as const, error: "Preuve introuvable." };

  const urls: string[] = [];
  for (const p of paths) {
    const { data } = await admin.storage.from(PROOFS_BUCKET).createSignedUrl(p, 60 * 10);
    if (data?.signedUrl) urls.push(data.signedUrl);
  }
  if (!urls.length) return { ok: false as const, error: "Lien indisponible." };
  return { ok: true as const, urls };
}
