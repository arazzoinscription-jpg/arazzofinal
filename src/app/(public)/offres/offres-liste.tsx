"use client";

/**
 * Page LISTE d'un service (présentiel OU en ligne) — une page séparée qui montre
 * TOUTES les offres du service, chacune menant à sa propre landing. Même design
 * `pl-` que le hub, bilingue FR/AR. Ouverte depuis les boutons du hub `/offres`.
 */

import { useEffect, useState } from "react";
import { LandingStyles } from "@/lib/landing-kit";

export type Item = { slug: string; name: string; sous?: string | null; prix?: string | null };

const CLE_LANGUE = "arazzo_formation_langue";

const T: Record<"ar" | "fr", any> = {
  ar: {
    dir: "rtl", toggle: "Français", back: "← كل العروض",
    presentiel: { eyebrow: "🏫 تكوينات حضورية · سطيف", titre: "التكوينات الحضورية", lede: "كل تكويناتنا الحضورية بسطيف — اختاري المستوى الذي يناسبكِ." },
    online: { eyebrow: "🖥️ تكوينات عن بُعد", titre: "التكوينات عن بُعد", lede: "كل تكويناتنا عن بُعد — عبر المنصّة، بإيقاعكِ، وصول مدى الحياة." },
    empty: "لا توجد عروض متاحة حاليًا.", pied: "Arazzo · مدرسة الخياطة",
  },
  fr: {
    dir: "ltr", toggle: "العربية", back: "← Toutes les offres",
    presentiel: { eyebrow: "🏫 Présentiel · Sétif", titre: "Formations en présentiel", lede: "Toutes nos formations au centre à Sétif — choisissez le niveau qui vous convient." },
    online: { eyebrow: "🖥️ En ligne", titre: "Formations en ligne", lede: "Toutes nos formations à distance — sur la plateforme, à votre rythme, accès à vie." },
    empty: "Aucune offre disponible pour le moment.", pied: "Arazzo · École de couture",
  },
};

export default function OffreListe({ kind, items }: { kind: "presentiel" | "online"; items: Item[] }) {
  const [langue, setLangue] = useState<"ar" | "fr">("fr");

  useEffect(() => {
    try {
      const g = window.localStorage.getItem(CLE_LANGUE);
      if (g === "fr" || g === "ar") setLangue(g);
    } catch { /* ignore */ }
  }, []);

  function changerLangue() {
    setLangue((l) => {
      const s = l === "ar" ? "fr" : "ar";
      try { window.localStorage.setItem(CLE_LANGUE, s); } catch { /* ignore */ }
      return s;
    });
  }

  const t = T[langue];
  const s = kind === "presentiel" ? t.presentiel : t.online;
  const base = kind === "presentiel" ? "/presentiel/" : "/formation/";
  const vert = kind === "presentiel";

  return (
    <div className="pl" dir={t.dir}>
      <LandingStyles />
      <button type="button" className="pl-langue" onClick={changerLangue} aria-label={t.toggle}>
        🌐 {t.toggle}
      </button>

      <header className="pl-hero">
        <div className="pl-hero-in">
          <div className="pl-marque">
            <a href="/offres" style={{ display: "inline-flex", alignItems: "center", gap: 11, textDecoration: "none", color: "inherit" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="pl-logo" src="/arazzo-icon.png" alt="Arazzo" width={40} height={40} />
              <span className="pl-marque-nom">Arazzo <em>Formation</em></span>
            </a>
          </div>
          <span className="pl-eyebrow">{s.eyebrow}</span>
          <h1 className="pl-titre">{s.titre}</h1>
          <p className="pl-tagline">{s.lede}</p>
        </div>
      </header>

      <div className="pl-wrap">
        <div className="pl-card">
          <a className="pl-ghost" href="/offres" style={{ marginBottom: 14 }}>
            <span style={{ flex: 1 }}><strong>{t.back}</strong></span>
          </a>

          {items.length ? items.map((o) => (
            <a key={o.slug} className={`pl-ghost${vert ? " pl-ghost-alt" : ""}`} href={`${base}${o.slug}`}
              style={vert
                ? { marginBottom: 10, borderColor: "#128a4c", background: "color-mix(in srgb, #128a4c 8%, var(--panel))" }
                : { marginBottom: 10 }}>
              <span className="pl-ghost-ico">{vert ? "🏫" : "🎓"}</span>
              <span style={{ flex: 1 }}>
                <strong>{o.name}</strong>
                {[o.sous, o.prix].filter(Boolean).length
                  ? <small>{[o.sous, o.prix].filter(Boolean).join(" · ")}</small> : null}
              </span>
              <span className="pl-ghost-ico" aria-hidden="true">→</span>
            </a>
          )) : <p className="pl-note">{t.empty}</p>}

          <p className="pl-pied">{t.pied}</p>
        </div>
      </div>
    </div>
  );
}
