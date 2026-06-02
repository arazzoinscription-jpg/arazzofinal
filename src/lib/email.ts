import "server-only";
import { Resend } from "resend";
import { createAdminClient } from "@/lib/supabase/admin";
import type { EmailCategory } from "@/lib/email-templates";

const resend = new Resend(process.env.RESEND_API_KEY || "re_placeholder_build_key");
const FROM = process.env.RESEND_FROM || "onboarding@resend.dev";

interface SendArgs {
  userId?: string | null;   // pour vérifier les préférences + journaliser
  to: string;
  category: EmailCategory;
  subject: string;
  html: string;
  /** Ignore le check de préférences (emails critiques : reset, sécurité). */
  force?: boolean;
}

/**
 * Envoi central : respecte les préférences (opt-out par catégorie),
 * journalise chaque tentative dans email_log.
 * Retourne { ok, skipped, id }.
 */
export async function sendEmail({ userId, to, category, subject, html, force }: SendArgs) {
  const admin = createAdminClient();

  // 1) Vérifier l'opt-out (sauf force)
  if (userId && !force) {
    const { data: prefs } = await admin
      .from("email_preferences")
      .select(category)
      .eq("user_id", userId)
      .maybeSingle();
    const allowed = prefs ? (prefs as Record<string, boolean>)[category] !== false : true;
    if (!allowed) {
      await admin.from("email_log").insert({
        user_id: userId, to_email: to, category, subject, status: "skipped",
      });
      return { ok: false, skipped: true as const };
    }
  }

  // 2) Envoyer
  try {
    const { data, error } = await resend.emails.send({
      from: `Arazzo Formation <${FROM}>`,
      to,
      subject,
      html,
    });
    if (error) throw new Error(typeof error === "string" ? error : JSON.stringify(error));

    await admin.from("email_log").insert({
      user_id: userId ?? null, to_email: to, category, subject,
      status: "sent", resend_id: data?.id ?? null,
    });
    return { ok: true as const, skipped: false as const, id: data?.id };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    await admin.from("email_log").insert({
      user_id: userId ?? null, to_email: to, category, subject,
      status: "failed", error: msg,
    });
    return { ok: false as const, skipped: false as const, error: msg };
  }
}
