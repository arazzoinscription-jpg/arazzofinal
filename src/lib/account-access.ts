import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email";

type Admin = ReturnType<typeof createAdminClient>;
const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://www.formation-arazzo.store";

/**
 * Active le compte d'un·e élève (lève le ban + statut actif) et lui envoie un
 * email avec un lien de CRÉATION DE MOT DE PASSE → compte officiel sur le
 * nouveau site, accès à ses cours. Réservé à l'ADMIN (validation d'identité).
 */
export async function activateAndInvite(admin: Admin, userId: string): Promise<{ ok: boolean; error?: string }> {
  const { data: u } = await admin.from("users").select("email, nom").eq("id", userId).maybeSingle();
  if (!u?.email) return { ok: false, error: "Email introuvable." };

  await admin.auth.admin.updateUserById(userId, { ban_duration: "none", app_metadata: { status: "actif" } });

  const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
    type: "recovery",
    email: u.email,
    // Direct vers /auth/reset-password (PAS /auth/callback) : Supabase délivre la
    // session via le FRAGMENT d'URL (#access_token=...), jamais transmis au serveur
    // → une redirection serveur (callback) le perdrait. Le client Supabase navigateur
    // détecte automatiquement la session dans l'URL au chargement de la page cible.
    options: { redirectTo: `${SITE}/auth/reset-password` },
  });
  const link = linkData?.properties?.action_link;
  if (linkErr || !link) return { ok: false, error: linkErr?.message ?? "Lien impossible." };

  const prenom = (u.nom ?? "").split(" ")[0] || "chère élève";
  const html = `
    <div style="font-family:'DM Sans',Arial,sans-serif;background:#F5F0EB;padding:32px 16px;">
      <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:18px;overflow:hidden;box-shadow:0 10px 40px -12px rgba(75,59,199,.18);">
        <div style="background:linear-gradient(135deg,#4B3BC7,#2B2180);padding:30px;text-align:center;">
          <div style="font-size:26px;color:#fff;font-family:Georgia,serif;font-weight:bold;">✂ ARAZZO</div>
          <div style="font-size:13px;color:#E07840;font-style:italic;margin-top:2px;">Formation</div>
        </div>
        <div style="padding:34px;color:#444;line-height:1.65;font-size:15px;">
          <h2 style="color:#4B3BC7;font-family:Georgia,serif;margin:0 0 14px;">Bienvenue ${prenom} 🎓</h2>
          <p>Votre compte sur le nouveau site <strong>Arazzo Formation</strong> est activé. Pour y accéder et retrouver vos cours, créez votre mot de passe :</p>
          <div style="text-align:center;margin:28px 0 8px;">
            <a href="${link}" style="display:inline-block;background:#E07840;color:#fff;padding:14px 30px;border-radius:12px;text-decoration:none;font-weight:bold;font-size:15px;">Créer mon mot de passe</a>
          </div>
          <p style="font-size:13px;color:#888;">Ce lien est personnel et valable un temps limité.</p>
        </div>
        <div style="background:#F5F0EB;padding:16px;text-align:center;color:#999;font-size:12px;">${SITE.replace(/^https?:\/\//, "")}</div>
      </div>
    </div>`;
  const r = await sendEmail({ userId, to: u.email, category: "welcome", subject: "Activez votre compte Arazzo Formation 🎓", html, force: true });
  if (!r.ok && !r.skipped) return { ok: false, error: r.error ?? "Envoi email échoué." };
  return { ok: true };
}
