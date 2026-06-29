"use server";

import { notifyAdminEmail } from "@/lib/admin-notify";

/**
 * Notifie l'admin d'une nouvelle inscription. Appelée depuis le formulaire
 * d'inscription (client) juste après un signUp réussi. Best-effort : n'échoue jamais.
 */
export async function notifyAdminSignup(input: { nom?: string; email?: string; ville?: string; pays?: string; accountType?: string }) {
  const email = String(input?.email || "").trim();
  if (!email) return;
  await notifyAdminEmail(
    "🎉 Nouvelle inscription sur le site",
    {
      "Nom": input?.nom || "—",
      "Email": email,
      "Ville": input?.ville || "—",
      "Pays": input?.pays || "—",
      "Type de compte": input?.accountType || "élève",
    },
    { intro: "Une nouvelle personne vient de créer un compte.", link: "/admin/etudiants" },
  );
}
