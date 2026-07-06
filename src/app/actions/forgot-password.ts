"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createAccessLink, RESET_VALIDITY_MS } from "@/lib/access-link";
import { sendEmail } from "@/lib/email";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://www.formation-arazzo.store";

/**
 * Mot de passe oublié : envoie un email (via Resend, PAS le système email
 * intégré de Supabase qui n'est pas configuré et n'envoie rien en silence).
 * Renvoie toujours { ok: true } pour ne pas révéler si l'email existe.
 */
export async function requestPasswordReset(email: string) {
  const clean = (email ?? "").trim().toLowerCase();
  if (!clean || !clean.includes("@")) return { ok: false as const, error: "Email invalide." };

  try {
    const admin = createAdminClient();
    const { data: u } = await admin.from("users").select("id, nom").eq("email", clean).maybeSingle();
    if (!u) return { ok: true as const }; // ne pas révéler l'absence du compte

    // Lien branché Arazzo (formation-arazzo.store/acces/…) à COURTE durée (60 min)
    // et à USAGE UNIQUE : la route /acces/<token> connecte puis redirige vers la
    // page « Créez votre mot de passe », et le lien est invalidé dès le premier clic.
    const al = await createAccessLink(u.id, "/auth/reset-password", RESET_VALIDITY_MS, true);
    const link = al.ok ? al.url : null;
    if (!link) return { ok: true as const }; // best-effort (ex. migration 038 non appliquée)

    const prenom = (u.nom ?? "").split(" ")[0] || "";
    const html = `
      <div style="font-family:'DM Sans',Arial,sans-serif;background:#F5F0EB;padding:32px 16px;">
        <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:18px;overflow:hidden;box-shadow:0 10px 40px -12px rgba(75,59,199,.18);">
          <div style="background:linear-gradient(135deg,#4B3BC7,#2B2180);padding:30px;text-align:center;">
            <div style="font-size:26px;color:#fff;font-family:Georgia,serif;font-weight:bold;">✂ ARAZZO</div>
            <div style="font-size:13px;color:#E07840;font-style:italic;margin-top:2px;">Formation</div>
          </div>
          <div style="padding:34px;color:#444;line-height:1.65;font-size:15px;">
            <h2 style="color:#4B3BC7;font-family:Georgia,serif;margin:0 0 14px;">Réinitialisation du mot de passe${prenom ? `, ${prenom}` : ""}</h2>
            <p>Une demande de réinitialisation de mot de passe a été faite pour ce compte. Cliquez ci-dessous pour en choisir un nouveau :</p>
            <div style="text-align:center;margin:28px 0 8px;">
              <a href="${link}" style="display:inline-block;background:#E07840;color:#fff;padding:14px 30px;border-radius:12px;text-decoration:none;font-weight:bold;font-size:15px;">Choisir un nouveau mot de passe</a>
            </div>
            <p style="font-size:13px;color:#888;">Si vous n'êtes pas à l'origine de cette demande, ignorez simplement cet email.</p>
          </div>
          <div style="background:#F5F0EB;padding:16px;text-align:center;color:#999;font-size:12px;">${SITE.replace(/^https?:\/\//, "")}</div>
        </div>
      </div>`;
    await sendEmail({ userId: u.id, to: clean, category: "welcome", force: true, subject: "Réinitialisez votre mot de passe Arazzo", html });
    return { ok: true as const };
  } catch {
    return { ok: true as const }; // ne jamais révéler l'échec côté infra
  }
}
