"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { EMAIL_CATEGORY_KEYS } from "./categories";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, admin: null };
  const { data: prof } = await supabase.from("users").select("role").eq("id", user.id).single();
  return { ok: prof?.role === "admin", admin: createAdminClient() };
}

const SettingsSchema = z.record(z.string(), z.boolean());

/**
 * Enregistre les préférences ADMIN d'envoi des emails (catégorie → activé).
 * Vérifiées au centre par sendEmail avant tout envoi non critique.
 */
export async function saveEmailCategories(input: Record<string, boolean>) {
  const parsed = SettingsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Données invalides." };
  const { ok, admin } = await requireAdmin();
  if (!ok || !admin) return { ok: false, error: "Accès refusé." };

  // On ne garde que les catégories connues (pas de clés arbitraires en base).
  const clean: Record<string, boolean> = {};
  for (const k of EMAIL_CATEGORY_KEYS) {
    if (k in parsed.data) clean[k] = !!parsed.data[k];
  }

  const { error } = await admin
    .from("platform_config")
    .upsert({ id: 1, email_categories: clean, updated_at: new Date().toISOString() }, { onConflict: "id" });
  if (error) {
    const msg = /email_categories/.test(error.message)
      ? "Migration 069 non appliquée (colonne manquante) — lancez 069_email_category_settings.sql dans Supabase."
      : error.message;
    return { ok: false, error: msg };
  }

  revalidatePath("/admin/preferences");
  return { ok: true };
}
