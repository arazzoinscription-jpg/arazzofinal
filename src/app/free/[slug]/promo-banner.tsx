"use client";

/**
 * L'encart CODE PROMO d'une Delivery Page : pousser à s'inscrire VITE.
 *
 * Le code vient d'Arazzo OS (moteur de coupons du Live Engine : le « Cadeau du
 * direct » ou un code choisi) via l'instantané de la page. Les places restantes
 * sont les VRAIES places du code (utilisations max − utilisations), mises à jour
 * par l'OS ; rien n'est inventé ici. Un code expiré, épuisé ou nominatif n'arrive
 * jamais jusqu'ici (filtré côté OS et côté serveur de la page).
 *
 * Le compte à rebours ne s'affiche qu'après le montage (heure du navigateur) :
 * aucun écart entre le rendu serveur et le rendu client.
 */

import { useEffect, useState } from "react";

export type Promo = {
  code: string;
  discount_label?: string | null;
  remaining?: number | null;
  max_uses?: number | null;
  end_date?: string | null;
  message?: string | null;
  message_ar?: string | null;
};

const T = {
  fr: {
    title: "Code promo pour les plus rapides",
    discount: (l: string) => `${l} sur votre inscription`,
    copy: "Copier", copied: "Copié ✓",
    places: (n: number) => (n <= 1 ? "Plus qu’1 place avec ce code !" : `Plus que ${n} places avec ce code !`),
    ends: "Expire dans",
    hint: "Utilisez-le lors de votre inscription, dans la case « code promo ».",
    go: "Je m’inscris maintenant →",
    goTest: "📝 Faire le test de niveau",
    goOnline: "🎓 Voir les formations en ligne →",
    d: "j", h: "h", m: "min",
  },
  ar: {
    title: "كود تخفيض للأسرع",
    discount: (l: string) => `${l} على تسجيلك`,
    copy: "نسخ", copied: "تم النسخ ✓",
    places: (n: number) => (n <= 1 ? "بقي مكان واحد فقط بهذا الكود!" : `بقيت ${n} أماكن فقط بهذا الكود!`),
    ends: "ينتهي خلال",
    hint: "استعمليه عند التسجيل، في خانة « كود التخفيض ».",
    go: "← سجّلي الآن",
    goTest: "📝 قومي باختبار المستوى",
    goOnline: "🎓 التكوينات عن بُعد →",
    d: "ي", h: "سا", m: "د",
  },
};

function resteAvant(fin: string | null | undefined, now: number) {
  if (!fin) return null;
  const ms = Date.parse(fin) - now;
  if (!Number.isFinite(ms) || ms <= 0) return null;
  const min = Math.floor(ms / 60_000);
  return { d: Math.floor(min / 1440), h: Math.floor((min % 1440) / 60), m: min % 60 };
}

export default function PromoBanner({
  promo, langue, ctaUrl, onTest,
}: { promo: Promo | null | undefined; langue: "fr" | "ar"; ctaUrl?: string | null; onTest?: () => void }) {
  const t = T[langue];
  const [now, setNow] = useState<number | null>(null);
  const [copie, setCopie] = useState(false);

  useEffect(() => {
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  if (!promo?.code) return null;
  const reste = now != null ? resteAvant(promo.end_date, now) : null;
  // Expiré pendant que la page est ouverte : l'encart disparaît.
  if (now != null && promo.end_date && !reste) return null;

  const total = Number(promo.max_uses);
  const places = promo.remaining;
  const avecJauge = places != null && Number.isFinite(total) && total > 0;
  const message = (langue === "ar" && promo.message_ar) ? promo.message_ar : promo.message;

  async function copier() {
    try { await navigator.clipboard.writeText(promo!.code); } catch { /* le code reste lisible */ }
    setCopie(true);
    window.setTimeout(() => setCopie(false), 2000);
  }

  return (
    <section aria-label={t.title} style={{
      border: "2px dashed var(--brass, #FE7223)", borderRadius: 18, padding: "18px 18px 16px",
      background: "color-mix(in srgb, var(--brass, #FE7223) 7%, var(--panel, #fff))", margin: "0 0 22px",
    }}>
      <p style={{ margin: 0, fontWeight: 800, color: "var(--violet-deep, #2A0880)" }}>🎟️ {t.title}</p>

      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", margin: "12px 0 6px" }}>
        <span style={{
          fontFamily: "ui-monospace, monospace", fontWeight: 800, fontSize: "1.5rem", letterSpacing: ".08em",
          background: "var(--panel, #fff)", border: "1px solid var(--line, #E6DECF)", borderRadius: 12,
          padding: "8px 14px", color: "var(--brass, #FE7223)", direction: "ltr",
        }}>{promo.code}</span>
        <button type="button" onClick={copier} className="pl-testbtn" style={{ margin: 0 }}>
          {copie ? t.copied : `📋 ${t.copy}`}
        </button>
      </div>

      {promo.discount_label ? (
        <p style={{ margin: "4px 0", fontWeight: 700 }}>{t.discount(promo.discount_label)}</p>
      ) : null}

      {avecJauge ? (
        <div style={{ margin: "10px 0 4px" }}>
          <p style={{ margin: "0 0 6px", fontWeight: 700, color: "var(--bad, #B3261E)" }}>⏳ {t.places(places as number)}</p>
          <div style={{ height: 10, borderRadius: 999, background: "rgba(0,0,0,.08)", overflow: "hidden" }}>
            <div style={{
              height: "100%", borderRadius: 999, background: "var(--brass, #FE7223)",
              width: `${Math.min(100, Math.max(4, ((total - (places as number)) / total) * 100))}%`,
            }} />
          </div>
        </div>
      ) : null}

      {reste ? (
        <p style={{ margin: "8px 0 0", fontWeight: 600 }}>
          ⏰ {t.ends} {reste.d ? `${reste.d} ${t.d} ` : ""}{reste.h} {t.h} {String(reste.m).padStart(2, "0")} {t.m}
        </p>
      ) : null}

      {message ? <p style={{ margin: "8px 0 0" }}>{message}</p> : null}

      <p style={{ margin: "10px 0 0", fontSize: ".92rem", opacity: 0.85 }}>{t.hint}</p>

      {/* Deux choix pour s'inscrire : faire le test de niveau, OU voir toutes les
          formations en ligne (lien vert). */}
      {/* Les deux boutons côte à côte (gauche / droite), même sur téléphone. */}
      <div style={{
        display: "grid", gap: 8, marginTop: 12,
        gridTemplateColumns: onTest ? "repeat(2, minmax(0, 1fr))" : "1fr",
      }}>
        {onTest ? (
          <button type="button" onClick={onTest} className="pl-testbtn"
            style={{ margin: 0, justifyContent: "center", textAlign: "center", padding: "10px 8px", fontSize: ".86rem", lineHeight: 1.25, overflowWrap: "anywhere" }}>
            {t.goTest}
          </button>
        ) : null}
        <a href={ctaUrl || "/offres/en-ligne"} style={{
          display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, textDecoration: "none",
          textAlign: "center", lineHeight: 1.25, overflowWrap: "anywhere",
          fontWeight: 700, fontSize: ".86rem", color: "#fff", background: "#128a4c",
          padding: "10px 8px", borderRadius: 999,
        }}>
          {t.goOnline}
        </a>
      </div>
    </section>
  );
}
