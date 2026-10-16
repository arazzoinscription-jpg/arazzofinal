/**
 * Cloche de classe — règles PURES (testables), sans aucun envoi.
 * L'enseignante fait sonner la cloche pour une classe (groupe) ou un niveau, tout de suite ou à une
 * date et une heure d'Alger (UTC+1, sans heure d'été).
 */

export const MESSAGES_CLOCHE = [
  "🔔 La classe commence !",
  "⏰ Le live commence dans 5 minutes",
  "✂️ Pause terminée, on reprend",
  "📚 C'est l'heure de votre leçon",
] as const;

/** Une cloche programmée ne peut pas être prévue plus loin que cela. */
export const HORIZON_JOURS = 60;
/** Une cloche « en retard » de plus de 2 h n'est plus envoyée (elle n'a plus de sens). */
export const RETARD_MAX_MS = 2 * 60 * 60_000;

export function validerMessageCloche(brut: unknown): { ok: true; message: string } | { ok: false; erreur: string } {
  const m = typeof brut === "string" ? brut.replace(/\s+/g, " ").trim() : "";
  if (m.length < 2 || m.length > 200) return { ok: false, erreur: "Le message de la cloche doit faire entre 2 et 200 caractères." };
  return { ok: true, message: m };
}

/**
 * Quand sonner : « maintenant », ou une date-heure d'Alger « AAAA-MM-JJTHH:MM » (champ datetime-local).
 * Refuse le passé (au-delà d'une minute de marge) et au-delà de l'horizon.
 */
export function lireQuand(brut: unknown, maintenant: Date): { ok: true; iso: string; immediat: boolean } | { ok: false; erreur: string } {
  if (brut === "maintenant") return { ok: true, iso: maintenant.toISOString(), immediat: true };
  if (typeof brut !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(brut)) return { ok: false, erreur: "Choisissez la date et l'heure de la cloche." };
  const d = new Date(`${brut}:00+01:00`);
  if (Number.isNaN(d.getTime())) return { ok: false, erreur: "Date ou heure invalide." };
  if (d.getTime() < maintenant.getTime() - 60_000) return { ok: false, erreur: "Cette heure est déjà passée." };
  if (d.getTime() > maintenant.getTime() + HORIZON_JOURS * 86_400_000) return { ok: false, erreur: `Au plus ${HORIZON_JOURS} jours à l'avance.` };
  return { ok: true, iso: d.toISOString(), immediat: false };
}

/** Une cloche programmée est-elle à envoyer maintenant ? */
export function aSonner(c: { sonne_le: string; envoyee_le: string | null; annulee_le: string | null }, maintenant: Date): boolean {
  if (c.envoyee_le || c.annulee_le) return false;
  const t = new Date(c.sonne_le).getTime();
  return t <= maintenant.getTime() + 30_000 && t >= maintenant.getTime() - RETARD_MAX_MS;
}

export type EtatCloche = "programmee" | "envoyee" | "annulee" | "manquee";

export function etatCloche(c: { sonne_le: string; envoyee_le: string | null; annulee_le: string | null }, maintenant: Date): EtatCloche {
  if (c.annulee_le) return "annulee";
  if (c.envoyee_le) return "envoyee";
  return new Date(c.sonne_le).getTime() < maintenant.getTime() - RETARD_MAX_MS ? "manquee" : "programmee";
}

/** Heure d'Alger lisible (« jeu. 16 oct., 20:00 »). */
export function heureAlger(iso: string): string {
  return new Date(iso).toLocaleString("fr-FR", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Algiers" });
}

/** La notification envoyée à chaque élève (cloche du site + téléphone via le webhook push). */
export function notificationCloche(message: string): { type: "cloche"; title: string; body: string; link: string } {
  return { type: "cloche", title: message.startsWith("🔔") ? message : `🔔 ${message}`, body: "Votre enseignante fait sonner la cloche de la classe.", link: "/dashboard/classe" };
}
