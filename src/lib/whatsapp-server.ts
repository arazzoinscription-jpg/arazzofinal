import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildWaLink, normalizePhone } from "@/lib/whatsapp";

type Admin = ReturnType<typeof createAdminClient>;

const firstName = (nom: string | null | undefined) => (nom || "").trim().split(/\s+/)[0] || "";

export interface BubbleState {
  /** Lien wa.me prêt à ouvrir, ou null si aucun numéro n'est configuré. */
  href: string | null;
  /** Message affiché au clic quand href est null (numéro manquant). */
  hint: string;
}

/**
 * Résout la bulle WhatsApp pour un utilisateur d'un espace privé.
 * - Espace ÉTUDIANT : formateur assigné (formateur du cours le plus récemment
 *   suivi) s'il a un numéro, sinon numéro de l'administrateur. Message pré-rempli
 *   avec les infos utiles (nom, email, formation).
 * - Espace FORMATEUR : numéro de l'administrateur + message par défaut.
 * La bulle reste VISIBLE même sans numéro (href = null → message d'aide au clic).
 * Renvoie null UNIQUEMENT si l'administrateur a désactivé la bulle.
 * Utilise le client service-role (lecture du numéro d'un autre utilisateur).
 */
export async function getWhatsAppBubble(
  admin: Admin,
  opts: { userId: string; nom: string | null; email: string | null; space: "student" | "formateur" },
): Promise<BubbleState | null> {
  const { data: cfg } = await admin
    .from("platform_config")
    .select("whatsapp_admin_number, whatsapp_default_message, whatsapp_bubble_enabled")
    .eq("id", 1)
    .maybeSingle();

  // La bulle n'existe pas seulement si l'admin l'a explicitement désactivée.
  if (cfg && cfg.whatsapp_bubble_enabled === false) return null;

  const adminPhone = normalizePhone(cfg?.whatsapp_admin_number);
  const defaultMsg = (cfg?.whatsapp_default_message || "").trim() || "Bonjour, j'ai une question à propos d'Arazzo Formation.";

  // Espace formateur → toujours l'administrateur.
  if (opts.space === "formateur") {
    return {
      href: buildWaLink(adminPhone, defaultMsg),
      hint: "Le numéro WhatsApp de l'administrateur n'est pas encore configuré (Espace Admin › WhatsApp).",
    };
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

  const prenom = firstName(opts.nom);
  const message =
    `Bonjour, je suis ${opts.nom || prenom || "une élève"}` +
    (opts.email ? ` (${opts.email})` : "") +
    (courseTitre ? `, inscrite à « ${courseTitre} »` : "") +
    `. J'ai une question.`;

  return {
    href: buildWaLink(targetPhone, message),
    hint: "Le contact WhatsApp n'est pas encore configuré. Votre formatrice doit renseigner son numéro dans son profil, ou l'administrateur dans Espace Admin › WhatsApp.",
  };
}
