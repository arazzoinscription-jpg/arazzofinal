import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildWaLink, normalizePhone } from "@/lib/whatsapp";

type Admin = ReturnType<typeof createAdminClient>;

const firstName = (nom: string | null | undefined) => (nom || "").trim().split(/\s+/)[0] || "";

export interface BubbleConfig {
  href: string;
}

/**
 * Résout la cible de la bulle WhatsApp pour un utilisateur d'un espace privé.
 * - Espace ÉTUDIANT : formateur assigné (formateur du cours le plus récemment
 *   suivi) s'il a un numéro, sinon numéro de l'administrateur. Message pré-rempli
 *   avec les infos utiles (nom, email, formation).
 * - Espace FORMATEUR : numéro de l'administrateur + message par défaut.
 * Renvoie null si la bulle est désactivée ou si aucun numéro n'est joignable.
 * Utilise le client service-role (lecture du numéro d'un autre utilisateur).
 */
export async function getWhatsAppBubble(
  admin: Admin,
  opts: { userId: string; nom: string | null; email: string | null; space: "student" | "formateur" },
): Promise<BubbleConfig | null> {
  const { data: cfg } = await admin
    .from("platform_config")
    .select("whatsapp_admin_number, whatsapp_default_message, whatsapp_bubble_enabled")
    .eq("id", 1)
    .maybeSingle();

  if (!cfg || cfg.whatsapp_bubble_enabled === false) return null;

  const adminPhone = normalizePhone(cfg.whatsapp_admin_number);
  const defaultMsg = (cfg.whatsapp_default_message || "").trim() || "Bonjour, j'ai une question à propos d'Arazzo Formation.";

  // Espace formateur → toujours l'administrateur.
  if (opts.space === "formateur") {
    const href = buildWaLink(adminPhone, defaultMsg);
    return href ? { href } : null;
  }

  // Espace étudiant → formateur assigné (dernière inscription) sinon admin.
  let targetPhone = adminPhone;
  let courseTitre: string | null = null;

  const { data: enr } = await admin
    .from("enrollments")
    .select("enrolled_at, course:courses(formateur_id, titre_fr)")
    .eq("user_id", opts.userId)
    .order("enrolled_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const course = enr ? (Array.isArray(enr.course) ? enr.course[0] : enr.course) : null;
  const formateurId = (course as { formateur_id?: string } | null)?.formateur_id ?? null;
  courseTitre = (course as { titre_fr?: string } | null)?.titre_fr ?? null;

  if (formateurId) {
    const { data: fp } = await admin.from("users").select("whatsapp").eq("id", formateurId).maybeSingle();
    const formateurPhone = normalizePhone(fp?.whatsapp);
    if (formateurPhone) targetPhone = formateurPhone;
  }

  if (!targetPhone) return null;

  const prenom = firstName(opts.nom);
  const message =
    `Bonjour, je suis ${opts.nom || prenom || "une élève"}` +
    (opts.email ? ` (${opts.email})` : "") +
    (courseTitre ? `, inscrite à « ${courseTitre} »` : "") +
    `. J'ai une question.`;

  const href = buildWaLink(targetPhone, message);
  return href ? { href } : null;
}
