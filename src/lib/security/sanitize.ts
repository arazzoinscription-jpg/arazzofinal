/**
 * Sanitisation centralisée (isomorphe serveur + client), SANS dépendance à
 * jsdom/DOMPurify : `isomorphic-dompurify` charge jsdom côté serveur, dont une
 * dépendance transitive (`@exodus/bytes` via `html-encoding-sniffer`) est en ESM
 * pur → `ERR_REQUIRE_ESM` au runtime serverless Vercel → plantage des Server
 * Actions (envoi de travail pratique, question, profil…). On reste donc en JS pur.
 *
 * Les sorties sont stockées en base puis rendues par React (qui échappe
 * automatiquement le texte) → aucun risque XSS pour le texte simple.
 */

/** Retire toutes les balises HTML d'une chaîne. */
function stripTags(s: string): string {
  // Supprime les blocs script/style avec leur contenu, puis toute autre balise.
  return s
    .replace(/<\s*(script|style)\b[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, "")
    .replace(/<[^>]*>/g, "");
}

/** Échappe les caractères HTML dangereux (pour un rendu en tant que HTML sûr). */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Texte pur : retire tout HTML. À appliquer aux champs texte avant insert/update. */
export function sanitizeText(input: unknown): string {
  if (input == null) return "";
  return stripTags(String(input)).trim();
}

/**
 * HTML restreint. Implémentation conservatrice sans lib : on neutralise tout le
 * HTML (échappement) — sûr par défaut. (Actuellement non utilisé dans le code ;
 * si un rendu HTML formaté devient nécessaire, intégrer `sanitize-html` côté serveur.)
 */
export function sanitizeHTML(input: unknown): string {
  if (input == null) return "";
  return escapeHtml(stripTags(String(input))).trim();
}

/** Contenu riche : idem, neutralisé par défaut (voir note ci-dessus). */
export function sanitizeRichContent(input: unknown): string {
  if (input == null) return "";
  return escapeHtml(stripTags(String(input))).trim();
}

/** Applique sanitizeText à toutes les valeurs string d'un objet (champs de formulaire). */
export function sanitizeObject<T extends Record<string, unknown>>(obj: T): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    out[k] = typeof v === "string" ? sanitizeText(v) : v;
  }
  return out as T;
}
