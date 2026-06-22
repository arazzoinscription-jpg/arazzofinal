"use client";

import { useEffect } from "react";

/**
 * Filet de sécurité pour les liens de réinitialisation / activation (recovery).
 *
 * Quand l'URL de redirection (`/auth/reset-password`) n'est pas dans la liste
 * blanche Supabase, Supabase redirige vers le Site URL (l'accueil) en laissant
 * la session dans le #fragment (`#access_token=…&type=recovery`). L'accueil
 * ignore ce fragment → l'utilisateur reste bloqué.
 *
 * Ce composant (monté globalement) détecte ce cas sur N'IMPORTE QUELLE page et
 * réachemine vers /auth/reset-password en conservant le fragment, pour que la
 * page de création de mot de passe puisse poser la session.
 */
export function RecoveryRedirect() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.pathname.startsWith("/auth/reset-password")) return;

    const hash = window.location.hash.replace(/^#/, "");
    if (!hash) return;
    const hp = new URLSearchParams(hash);

    const type = hp.get("type");
    const hasTokens = !!(hp.get("access_token") && hp.get("refresh_token"));
    const errCode = hp.get("error_code") || "";

    // Lien recovery réussi (type=recovery + tokens) OU lien recovery expiré/consommé.
    const isRecovery = type === "recovery" || (hasTokens && type === "recovery");
    const isRecoveryError = /otp|recovery|expired/i.test(errCode);

    if (isRecovery || isRecoveryError) {
      window.location.replace(`/auth/reset-password#${hash}`);
    }
  }, []);

  return null;
}
