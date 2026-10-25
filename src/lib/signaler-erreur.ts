/**
 * Écran « Une erreur s'est produite » : envoie ce qui a planté au serveur (Admin → Journal d'activité
 * « Erreur d'affichage » + journaux Vercel), avec la page et si le navigateur la traduisait. Ne jette jamais.
 */
export function signalerErreur(error: Error & { digest?: string }) {
  try {
    const traduite = /\btranslated-(ltr|rtl)\b/.test(document.documentElement.className);
    fetch("/api/client-error", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      keepalive: true,
      body: JSON.stringify({
        message: String(error?.message ?? error),
        digest: error?.digest,
        pile: String(error?.stack ?? "").split("\n").slice(0, 6).join("\n"),
        page: location.pathname + location.search,
        traduite: traduite ? "oui" : "non",
      }),
    }).catch(() => {});
  } catch { /* rien */ }
}
