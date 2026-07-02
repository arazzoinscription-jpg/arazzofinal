/**
 * Helpers WhatsApp PURS et client-safe (aucune dépendance serveur).
 * Réutilisés par les Server Actions, les pages serveur ET les composants client
 * (bouton de vérification du lien de groupe, bulle flottante).
 */

/** Ne garde que les chiffres d'un numéro (format wa.me). Renvoie "" si vide. */
export function normalizePhone(raw: string | null | undefined): string {
  return (raw ?? "").replace(/\D/g, "");
}

/** Construit un lien wa.me (conversation 1:1) avec message pré-rempli. */
export function buildWaLink(phone: string | null | undefined, message?: string | null): string | null {
  const digits = normalizePhone(phone);
  if (!digits) return null;
  const base = `https://wa.me/${digits}`;
  return message && message.trim() ? `${base}?text=${encodeURIComponent(message.trim())}` : base;
}

/**
 * Lien d'invitation officiel d'un groupe WhatsApp :
 * https://chat.whatsapp.com/XXXXXXXX (le code fait au moins ~10 caractères).
 */
export const WHATSAPP_GROUP_LINK_RE = /^https:\/\/chat\.whatsapp\.com\/[A-Za-z0-9]{8,}$/;

export function isValidWhatsAppGroupLink(url: string | null | undefined): boolean {
  return WHATSAPP_GROUP_LINK_RE.test((url ?? "").trim());
}
