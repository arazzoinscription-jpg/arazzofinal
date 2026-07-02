"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email";
import { getProspectSettings } from "@/lib/prospects";
import { renderProspectEmail, type ProspectEmailKind } from "@/lib/email-templates";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, admin: null };
  const { data: prof } = await supabase.from("users").select("role").eq("id", user.id).single();
  return { ok: prof?.role === "admin", admin: createAdminClient() };
}

const KindSchema = z.enum(["welcome", "reminder_2", "reminder_7", "reminder_14"]);
const STAMP: Record<ProspectEmailKind, string> = {
  welcome: "welcome_sent_at",
  reminder_2: "reminder_2_sent_at",
  reminder_7: "reminder_7_sent_at",
  reminder_14: "reminder_14_sent_at",
};

const firstName = (nom: string | null | undefined) => (nom || "").trim().split(/\s+/)[0] || "à vous";

/** Envoie (ou renvoie) manuellement un email de la séquence à un prospect. */
export async function sendProspectEmail(input: { userId: string; kind: z.infer<typeof KindSchema> }) {
  const parsed = z.object({ userId: z.string().uuid(), kind: KindSchema }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Données invalides." };
  const { ok, admin } = await requireAdmin();
  if (!ok || !admin) return { ok: false, error: "Accès refusé." };

  const { userId, kind } = parsed.data;
  const { data: u } = await admin.from("users").select("nom, email").eq("id", userId).maybeSingle();
  if (!u?.email) return { ok: false, error: "Utilisateur ou email introuvable." };

  const settings = await getProspectSettings(admin);
  const branding = { signature: settings.signature, logoUrl: settings.logo_url, promoText: settings.promo_enabled ? settings.promo_text : null };
  const overrides =
    kind === "welcome" ? { subject: settings.subject_welcome, html: settings.html_welcome }
    : kind === "reminder_2" ? { subject: settings.subject_reminder_2, html: settings.html_reminder_2 }
    : kind === "reminder_7" ? { subject: settings.subject_reminder_7, html: settings.html_reminder_7 }
    : { subject: settings.subject_reminder_14, html: settings.html_reminder_14 };

  const tpl = renderProspectEmail(kind, firstName(u.nom), branding, overrides);
  // Envoi forcé (action admin manuelle) : on respecte quand même le journal email_log.
  const res = await sendEmail({ userId, to: u.email, category: tpl.category, subject: tpl.subject, html: tpl.html, force: true });

  // Garantit la ligne de suivi + horodate l'email s'il n'était pas encore marqué.
  const nowISO = new Date().toISOString();
  await admin.from("prospect_sequence").upsert(
    { user_id: userId, updated_at: nowISO },
    { onConflict: "user_id", ignoreDuplicates: true },
  );
  await admin.from("prospect_sequence")
    .update({ [STAMP[kind]]: nowISO, last_reminder_at: nowISO, updated_at: nowISO })
    .eq("user_id", userId)
    .is(STAMP[kind], null);

  revalidatePath("/admin/prospects");
  if (res.skipped) return { ok: false, error: "Envoi ignoré (l'utilisateur a désactivé ces emails)." };
  if (res.error) return { ok: false, error: res.error };
  return { ok: true };
}

const SettingsSchema = z.object({
  enabled: z.boolean(),
  delay_welcome_days: z.number().int().min(0).max(365),
  delay_reminder_2_days: z.number().int().min(0).max(365),
  delay_reminder_7_days: z.number().int().min(0).max(365),
  delay_reminder_14_days: z.number().int().min(0).max(365),
  delay_deletion_months: z.number().int().min(1).max(60),
  subject_welcome: z.string().max(200).nullable(),
  html_welcome: z.string().max(20000).nullable(),
  subject_reminder_2: z.string().max(200).nullable(),
  html_reminder_2: z.string().max(20000).nullable(),
  subject_reminder_7: z.string().max(200).nullable(),
  html_reminder_7: z.string().max(20000).nullable(),
  subject_reminder_14: z.string().max(200).nullable(),
  html_reminder_14: z.string().max(20000).nullable(),
  promo_enabled: z.boolean(),
  promo_text: z.string().max(500).nullable(),
  signature: z.string().max(2000).nullable(),
  logo_url: z.string().max(500).nullable(),
});
export type ProspectSettingsInput = z.infer<typeof SettingsSchema>;

/** Enregistre les paramètres éditables de la séquence prospect. */
export async function saveProspectSettings(input: ProspectSettingsInput) {
  const parsed = SettingsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Données invalides." };
  const { ok, admin } = await requireAdmin();
  if (!ok || !admin) return { ok: false, error: "Accès refusé." };

  const clean = (v: string | null) => (v && v.trim() ? v.trim() : null);
  const d = parsed.data;
  const { error } = await admin.from("prospect_settings").update({
    ...d,
    subject_welcome: clean(d.subject_welcome), html_welcome: clean(d.html_welcome),
    subject_reminder_2: clean(d.subject_reminder_2), html_reminder_2: clean(d.html_reminder_2),
    subject_reminder_7: clean(d.subject_reminder_7), html_reminder_7: clean(d.html_reminder_7),
    subject_reminder_14: clean(d.subject_reminder_14), html_reminder_14: clean(d.html_reminder_14),
    promo_text: clean(d.promo_text), signature: clean(d.signature), logo_url: clean(d.logo_url),
    updated_at: new Date().toISOString(),
  }).eq("id", 1);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/prospects/parametres");
  revalidatePath("/admin/prospects");
  return { ok: true };
}

/** Suspend / reprend la séquence automatique pour un ou plusieurs prospects. */
export async function setProspectSequence(input: { userIds: string[]; suspend: boolean }) {
  const parsed = z.object({ userIds: z.array(z.string().uuid()).min(1).max(500), suspend: z.boolean() }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Données invalides." };
  const { ok, admin } = await requireAdmin();
  if (!ok || !admin) return { ok: false, error: "Accès refusé." };

  const { userIds, suspend } = parsed.data;
  const nowISO = new Date().toISOString();

  // S'assure qu'une ligne existe pour chaque utilisateur avant la mise à jour.
  await admin.from("prospect_sequence").upsert(
    userIds.map((id) => ({ user_id: id, updated_at: nowISO })),
    { onConflict: "user_id", ignoreDuplicates: true },
  );
  const { error } = await admin.from("prospect_sequence")
    .update(
      suspend
        ? { sequence_stopped: true, stopped_reason: "manual", updated_at: nowISO }
        : { sequence_stopped: false, stopped_reason: null, updated_at: nowISO },
    )
    .in("user_id", userIds);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/prospects");
  return { ok: true, count: userIds.length };
}
