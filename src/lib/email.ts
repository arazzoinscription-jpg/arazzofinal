import "server-only";
import { Resend } from "resend";
import { createAdminClient } from "@/lib/supabase/admin";
import type { EmailCategory } from "@/lib/email-templates";

/** Le contenu gardé au journal (borné : un e-mail énorme ne doit pas alourdir la base). */
const contenu = (html: string) => String(html ?? "").slice(0, 200_000);

const resend = new Resend(process.env.RESEND_API_KEY || "re_placeholder_build_key");
const FROM = process.env.RESEND_FROM || "onboarding@resend.dev";
const REPONDRE_A = (process.env.RESEND_REPLY_TO || "arazzoinscription@gmail.com").trim();
const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://www.formation-arazzo.store";
/** E-mails « de masse » (annonces, relances) : un lien de désinscription dans l'en-tête, comme l'exigent Gmail et Yahoo. */
const MASSE = new Set<EmailCategory>(["announcements", "prospect", "reactivation", "new_content"]);

/** La version TEXTE d'un e-mail HTML : un e-mail sans texte brut ressemble à de la publicité pour les filtres. */
export function texteBrut(html: string): string {
  return String(html ?? "")
    .replace(/<(style|script|head)[\s\S]*?<\/\1>/gi, "")
    .replace(/<a\s[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, (_m, href: string, txt: string) => `${txt.replace(/<[^>]+>/g, "").trim()} (${href})`)
    .replace(/<br\s*\/?>/gi, "\n").replace(/<\/(p|div|h[1-6]|li|tr)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#39;|&rsquo;/g, "’").replace(/&quot;/g, '"')
    .replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

/** Ce qu'on ajoute à CHAQUE envoi : nom de l'expéditeur, adresse de réponse, texte brut, désinscription. */
export function enveloppe(category: string, html: string) {
  return {
    replyTo: REPONDRE_A || undefined,
    text: texteBrut(html),
    ...(MASSE.has(category as EmailCategory) ? {
      headers: { "List-Unsubscribe": `<${SITE}/dashboard/preferences>, <mailto:${REPONDRE_A}?subject=desinscription>` },
    } : {}),
  };
}

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

  // 0) Préférences ADMIN globales : catégorie désactivée dans /admin/preferences
  //    → aucun envoi (sauf force = emails critiques). Résilient : si la colonne
  //    email_categories n'existe pas (migration 069 non appliquée), tout passe.
  if (!force) {
    try {
      const { data: cfg, error } = await admin
        .from("platform_config").select("email_categories").eq("id", 1).maybeSingle();
      if (!error) {
        const cats = (cfg as { email_categories?: Record<string, boolean> } | null)?.email_categories ?? {};
        if (cats[category] === false) {
          await admin.from("email_log").insert({
            user_id: userId ?? null, to_email: to, category, subject, status: "skipped",
            error: "Catégorie désactivée par l'admin (Préférences)", html: contenu(html), source: "lms",
          });
          return { ok: false, skipped: true as const };
        }
      }
    } catch { /* pré-migration 069 : on n'empêche pas l'envoi */ }
  }

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
        user_id: userId, to_email: to, category, subject, status: "skipped", html: contenu(html), source: "lms",
      });
      return { ok: false, skipped: true as const };
    }
  }

  // 1 bis) Une adresse dont le domaine ne reçoit pas d'e-mails REBONDIT — et chaque rebond fait classer l'école en
  //    indésirables chez Gmail. On ne l'envoie pas ; le journal dit pourquoi.
  try {
    const { domaineRecoitEmails } = await import("@/lib/email-verification-serveur");
    if (!(await domaineRecoitEmails(String(to).split("@")[1] ?? ""))) {
      await admin.from("email_log").insert({
        user_id: userId ?? null, to_email: to, category, subject, status: "skipped",
        error: "Domaine sans boîte mail (l'e-mail rebondirait)", html: contenu(html), source: "lms",
      });
      return { ok: false, skipped: true as const };
    }
  } catch { /* le contrôle ne bloque jamais un envoi */ }

  // 2) Envoyer
  try {
    const { data, error } = await resend.emails.send({
      from: `Arazzo Formation <${FROM}>`,
      to,
      subject,
      html,
      ...enveloppe(category, html),
    });
    if (error) throw new Error(typeof error === "string" ? error : JSON.stringify(error));

    await admin.from("email_log").insert({
      user_id: userId ?? null, to_email: to, category, subject,
      status: "sent", resend_id: data?.id ?? null, html: contenu(html), source: "lms",
    });
    return { ok: true as const, skipped: false as const, id: data?.id };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    await admin.from("email_log").insert({
      user_id: userId ?? null, to_email: to, category, subject,
      status: "failed", error: msg, html: contenu(html), source: "lms",
    });
    return { ok: false as const, skipped: false as const, error: msg };
  }
}
