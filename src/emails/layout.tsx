import * as React from "react";

// Layout HTML commun à tous les emails (styles inline pour la compatibilité
// avec les clients mail). Rendu en HTML via renderToStaticMarkup côté serveur.

export interface CTA { label: string; href: string; }

const COLORS = { violet: "#4B3BC7", violetDark: "#2B2180", orange: "#E07840", cream: "#F5F0EB", text: "#333333", muted: "#8a8a8a" };

export function EmailLayout({ title, children, cta, secondary }: {
  title: string;
  children: React.ReactNode;
  cta?: CTA;
  secondary?: React.ReactNode;
}) {
  return (
    <div style={{ fontFamily: "Arial, sans-serif", background: COLORS.cream, padding: "32px 16px" }}>
      <div style={{ maxWidth: 600, margin: "0 auto", background: "#fff", borderRadius: 18, overflow: "hidden", boxShadow: "0 10px 40px -12px rgba(75,59,199,.18)" }}>
        {/* En-tête */}
        <div style={{ background: `linear-gradient(135deg, ${COLORS.violet}, ${COLORS.violetDark})`, padding: 30, textAlign: "center" as const }}>
          <div style={{ fontSize: 26, color: "#fff", fontFamily: "Georgia, serif", fontWeight: "bold", letterSpacing: 1 }}>✂ ARAZZO</div>
          <div style={{ fontSize: 13, color: COLORS.orange, fontStyle: "italic", marginTop: 2 }}>Formation &amp; Boutique</div>
        </div>

        {/* Corps */}
        <div style={{ padding: "32px 30px" }}>
          <h1 style={{ fontSize: 20, color: COLORS.text, margin: "0 0 16px" }}>{title}</h1>
          <div style={{ fontSize: 15, color: COLORS.text, lineHeight: 1.6 }}>{children}</div>

          {cta && (
            <div style={{ textAlign: "center" as const, margin: "28px 0 8px" }}>
              <a href={cta.href} style={{ display: "inline-block", background: COLORS.orange, color: "#fff", textDecoration: "none", padding: "13px 28px", borderRadius: 10, fontWeight: "bold", fontSize: 15 }}>
                {cta.label}
              </a>
            </div>
          )}
          {secondary && <div style={{ marginTop: 18 }}>{secondary}</div>}
        </div>

        {/* Pied */}
        <div style={{ background: COLORS.cream, padding: "18px 30px", textAlign: "center" as const }}>
          <p style={{ fontSize: 12, color: COLORS.muted, margin: 0 }}>Arazzo Formation — Couture &amp; Modélisme</p>
          <p style={{ fontSize: 12, color: COLORS.muted, margin: "4px 0 0" }}>formation-arazzo.store</p>
        </div>
      </div>
    </div>
  );
}

/** Petit tableau récapitulatif de lignes de commande (réutilisé par plusieurs emails). */
export function ItemsTable({ items, total }: { items: { title: string; quantity: number; price: number }[]; total: number }) {
  const fmt = (n: number) => `${Number(n).toLocaleString("fr-DZ")} DA`;
  return (
    <table style={{ width: "100%", borderCollapse: "collapse" as const, marginTop: 8 }}>
      <thead>
        <tr style={{ background: "#F5F0EB" }}>
          <th style={{ textAlign: "left" as const, padding: "8px 10px", fontSize: 13, color: "#666" }}>Article</th>
          <th style={{ textAlign: "center" as const, padding: "8px 10px", fontSize: 13, color: "#666" }}>Qté</th>
          <th style={{ textAlign: "right" as const, padding: "8px 10px", fontSize: 13, color: "#666" }}>Total</th>
        </tr>
      </thead>
      <tbody>
        {items.map((it, i) => (
          <tr key={i} style={{ borderBottom: "1px solid #eee" }}>
            <td style={{ padding: "8px 10px", fontSize: 14 }}>{it.title}</td>
            <td style={{ padding: "8px 10px", fontSize: 14, textAlign: "center" as const }}>{it.quantity}</td>
            <td style={{ padding: "8px 10px", fontSize: 14, textAlign: "right" as const, fontWeight: "bold" }}>{fmt(it.price * it.quantity)}</td>
          </tr>
        ))}
        <tr>
          <td colSpan={2} style={{ padding: "10px", fontWeight: "bold", color: "#4B3BC7" }}>TOTAL</td>
          <td style={{ padding: "10px", textAlign: "right" as const, fontWeight: "bold", color: "#E07840", fontSize: 16 }}>{fmt(total)}</td>
        </tr>
      </tbody>
    </table>
  );
}
