"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createAccessLink } from "@/lib/access-link";
import { brandedSiteUrl } from "@/lib/site-url";
import { sendEmail } from "@/lib/email";

const SITE = brandedSiteUrl();

/**
 * Lien de connexion (« lien magique ») envoyé via RESEND depuis le site — et NON
 * par le système email intégré de Supabase (non configuré + redirige vers la Site
 * URL). On génère un lien branché `formation-arazzo.store/acces/<token>` (valable
 * 1h) qui connecte puis redirige vers /dashboard. Renvoie toujours { ok:true }
 * pour ne pas révéler si l'email existe.
 */
export async function requestMagicLink(email: string) {
  const clean = (email ?? "").trim().toLowerCase();
  if (!clean || !clean.includes("@")) return { ok: false as const, error: "Email invalide." };

  try {
    const admin = createAdminClient();
    const { data: u } = await admin.from("users").select("id, nom").eq("email", clean).maybeSingle();
    if (!u) return { ok: true as const }; // ne pas révéler l'absence du compte

    const al = await createAccessLink(u.id, "/dashboard", 60 * 60 * 1000); // 1 heure
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
            <h2 style="color:#4B3BC7;font-family:Georgia,serif;margin:0 0 14px;">Votre lien de connexion${prenom ? `, ${prenom}` : ""}</h2>
            <p>Cliquez sur le bouton ci-dessous pour vous connecter à votre espace Arazzo Formation. Ce lien est valable 1 heure.</p>
            <div style="text-align:center;margin:28px 0 8px;">
              <a href="${link}" style="display:inline-block;background:#E07840;color:#fff;padding:14px 30px;border-radius:12px;text-decoration:none;font-weight:bold;font-size:15px;">Me connecter</a>
            </div>
            <p style="font-size:13px;color:#888;">Si vous n'êtes pas à l'origine de cette demande, ignorez simplement cet email.</p>
          </div>
          <div style="background:#F5F0EB;padding:16px;text-align:center;color:#999;font-size:12px;">${SITE.replace(/^https?:\/\//, "")}</div>
        </div>
      </div>`;
    await sendEmail({ userId: u.id, to: clean, category: "welcome", force: true, subject: "Votre lien de connexion Arazzo Formation", html });
    return { ok: true as const };
  } catch {
    return { ok: true as const }; // ne jamais révéler l'échec côté infra
  }
}
