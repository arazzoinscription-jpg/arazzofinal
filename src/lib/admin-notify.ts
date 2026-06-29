import "server-only";
import { sendEmail } from "@/lib/email";

/** Adresse de notification admin (surchargée par ADMIN_NOTIFY_EMAIL si défini). */
export const ADMIN_NOTIFY_EMAIL = process.env.ADMIN_NOTIFY_EMAIL || "arazzoinscription@gmail.com";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://www.formation-arazzo.store";

/**
 * Envoie un email de notification à l'admin (nouvelle inscription, commande /offre,
 * commande sur mesure / placement, commande patron). Ne bloque JAMAIS l'action
 * utilisateur : toute erreur est avalée (sendEmail journalise déjà dans email_log).
 */
export async function notifyAdminEmail(
  subject: string,
  rows: Record<string, string | number | null | undefined>,
  opts?: { intro?: string; link?: string },
) {
  try {
    const cells = Object.entries(rows)
      .filter(([, v]) => v != null && String(v).trim() !== "")
      .map(
        ([k, v]) =>
          `<tr><td style="padding:5px 14px 5px 0;color:#6b7280;white-space:nowrap;vertical-align:top">${k}</td><td style="padding:5px 0;font-weight:600;color:#111827">${String(v)}</td></tr>`,
      )
      .join("");
    const linkBtn = opts?.link
      ? `<p style="margin:18px 0 0"><a href="${SITE}${opts.link}" style="display:inline-block;background:#FE7223;color:#fff;text-decoration:none;font-weight:700;padding:10px 18px;border-radius:10px">Ouvrir dans l'admin</a></p>`
      : "";
    const html = `<div style="font-family:system-ui,-apple-system,Segoe UI,Arial,sans-serif;max-width:540px;color:#111827">
  <h2 style="color:#5B16F9;margin:0 0 6px;font-size:18px">${subject}</h2>
  ${opts?.intro ? `<p style="color:#374151;margin:0 0 14px">${opts.intro}</p>` : ""}
  <table style="border-collapse:collapse;font-size:14px">${cells}</table>
  ${linkBtn}
  <p style="color:#9ca3af;font-size:12px;margin:20px 0 0">Arazzo Formation — notification automatique</p>
</div>`;

    await sendEmail({
      to: ADMIN_NOTIFY_EMAIL,
      userId: null,
      category: "announcements",
      subject,
      html,
      force: true, // notification interne : ignore les préférences d'opt-out
    });
  } catch {
    /* ne jamais faire échouer l'action utilisateur à cause d'un email */
  }
}
