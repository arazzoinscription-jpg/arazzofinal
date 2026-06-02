import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export type ActivityAction =
  | "login" | "logout" | "course_view" | "video_watch"
  | "download" | "question" | "answer";

/**
 * Journalise une action utilisateur (best-effort, ne jette jamais).
 * meta : contexte libre (titre du cours, nom du fichier…).
 */
export async function logActivity(
  userId: string,
  action: ActivityAction,
  meta?: Record<string, unknown>
) {
  try {
    const admin = createAdminClient();
    await admin.from("activity_log").insert({ user_id: userId, action, meta: meta ?? null });
  } catch {
    /* silencieux — la journalisation ne doit jamais bloquer une action */
  }
}

export const ACTION_LABELS: Record<string, { icon: string; label: string }> = {
  login: { icon: "🔑", label: "Connexion" },
  logout: { icon: "🚪", label: "Déconnexion" },
  course_view: { icon: "📖", label: "Leçon consultée" },
  video_watch: { icon: "▶️", label: "Vidéo regardée" },
  download: { icon: "⬇️", label: "Téléchargement" },
  question: { icon: "❓", label: "Question posée" },
  answer: { icon: "💬", label: "Réponse reçue" },
};
