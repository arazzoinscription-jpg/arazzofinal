"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isValidWhatsAppGroupLink } from "@/lib/whatsapp";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, admin: null };
  const { data: prof } = await supabase.from("users").select("role").eq("id", user.id).single();
  return { ok: prof?.role === "admin", admin: createAdminClient() };
}

const ConfigSchema = z.object({
  whatsapp_admin_number: z.string().max(40).nullable(),
  whatsapp_default_message: z.string().max(1000).nullable(),
  whatsapp_bubble_enabled: z.boolean(),
});
export type WhatsAppConfigInput = z.infer<typeof ConfigSchema>;

/** Enregistre la configuration WhatsApp de l'administrateur (singleton). */
export async function saveWhatsAppConfig(input: WhatsAppConfigInput) {
  const parsed = ConfigSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Données invalides." };
  const { ok, admin } = await requireAdmin();
  if (!ok || !admin) return { ok: false, error: "Accès refusé." };

  const clean = (v: string | null) => (v && v.trim() ? v.trim() : null);
  const { error } = await admin.from("platform_config").update({
    whatsapp_admin_number: clean(parsed.data.whatsapp_admin_number),
    whatsapp_default_message: clean(parsed.data.whatsapp_default_message),
    whatsapp_bubble_enabled: parsed.data.whatsapp_bubble_enabled,
    updated_at: new Date().toISOString(),
  }).eq("id", 1);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/whatsapp");
  return { ok: true };
}

/** Modifie / supprime le lien WhatsApp d'un groupe (admin). `link` null = suppression. */
export async function adminSetGroupWhatsApp(input: { groupId: string; link: string | null }) {
  const parsed = z.object({ groupId: z.string().uuid(), link: z.string().max(300).nullable() }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Données invalides." };
  const { ok, admin } = await requireAdmin();
  if (!ok || !admin) return { ok: false, error: "Accès refusé." };

  const link = parsed.data.link?.trim() || null;
  if (link && !isValidWhatsAppGroupLink(link)) {
    return { ok: false, error: "Lien invalide (attendu : https://chat.whatsapp.com/…)." };
  }
  const { error } = await admin.from("groups").update({ whatsapp_link: link }).eq("id", parsed.data.groupId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/whatsapp");
  return { ok: true };
}

/** Active / désactive le groupe WhatsApp (admin). */
export async function adminToggleGroupWhatsApp(input: { groupId: string; disabled: boolean }) {
  const parsed = z.object({ groupId: z.string().uuid(), disabled: z.boolean() }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Données invalides." };
  const { ok, admin } = await requireAdmin();
  if (!ok || !admin) return { ok: false, error: "Accès refusé." };

  const { error } = await admin.from("groups").update({ whatsapp_disabled: parsed.data.disabled }).eq("id", parsed.data.groupId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/whatsapp");
  return { ok: true };
}
