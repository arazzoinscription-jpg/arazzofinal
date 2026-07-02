"use client";

/**
 * Filet de sécurité GLOBAL (erreurs survenant jusque dans le layout racine).
 * Doit rendre son propre <html>/<body> et ne dépendre d'AUCUN composant lourd,
 * pour ne jamais planter lui-même (ex. vieux navigateur / WebView Galaxy M12).
 */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="fr">
      <body style={{ margin: 0, fontFamily: "system-ui, Arial, sans-serif", background: "#F5F0EB", color: "#2B2180" }}>
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ maxWidth: 420, textAlign: "center", background: "#fff", borderRadius: 18, padding: 28, boxShadow: "0 10px 40px -12px rgba(75,59,199,.2)" }}>
            <div style={{ fontSize: 44, marginBottom: 8 }}>✂️</div>
            <h1 style={{ fontSize: 20, margin: "0 0 8px" }}>Une erreur s'est produite</h1>
            <p style={{ fontSize: 14, color: "#555", lineHeight: 1.6, margin: "0 0 20px" }}>
              Un souci d'affichage est survenu. Rechargez la page — vos données ne sont pas perdues.
            </p>
            <button
              onClick={() => { try { reset(); } catch { location.reload(); } }}
              style={{ background: "#E07840", color: "#fff", border: 0, padding: "12px 26px", borderRadius: 12, fontWeight: 700, fontSize: 15, cursor: "pointer" }}
            >
              Recharger
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
