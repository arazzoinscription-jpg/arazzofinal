"use client";

/**
 * Landing PACK — MÊME DESIGN que les landings formation/présentiel (kit `pl-`),
 * bilingue FR/AR. Reprend le bloc « pack » de l'OS : les formations réunies côte
 * à côte, le prix normal BARRÉ → prix pack, et l'économie mise en avant.
 *
 * Back-end NATIF LMS : l'achat du pack passe par la boutique (`/boutique/<slug>`),
 * 24/7, sans tunnel — comme aujourd'hui.
 */

import { useEffect, useState } from "react";
import { LandingStyles } from "@/lib/landing-kit";

export type PackCourse = { id: string; title: string; prix: number | null; slug: string | null };
export type PackData = {
  name: string; name_ar?: string | null; description?: string | null;
  courses: PackCourse[]; cumul: number; prix: number; eco: number; buySlug: string | null;
};

const CLE_LANGUE = "arazzo_formation_langue";

const T: Record<"ar" | "fr", any> = {
  ar: {
    dir: "rtl", toggle: "Français", eyebrow: "🎁 حزمة تكوين",
    packTitle: "محتوى الحزمة (Pack)", packIncludes: "تكوينان في حزمة واحدة",
    packSee: "عرض التكوين", packValue: "القيمة الإجمالية",
    economy: (n: string) => `🎁 توفير ${n}`,
    cta: "أريد التسجيل في هذه الحزمة", ctaContact: "أريد هذه الحزمة — تواصلي معنا",
    platform: "📚 تُقدَّم الدروس على منصّتنا أرازو فورماسيون →",
    pied: "Arazzo · مدرسة الخياطة",
  },
  fr: {
    dir: "ltr", toggle: "العربية", eyebrow: "🎁 Pack formation",
    packTitle: "Ce que contient le pack", packIncludes: "Deux formations réunies en un pack",
    packSee: "Voir la formation", packValue: "Valeur totale",
    economy: (n: string) => `🎁 Vous économisez ${n}`,
    cta: "Je m’inscris à ce pack", ctaContact: "Je veux ce pack — nous contacter",
    platform: "📚 Les cours se déroulent sur notre plateforme Arazzo Formation →",
    pied: "Arazzo · École de couture",
  },
};

const fmt = (n: number) => Number(n || 0).toLocaleString("fr-FR");

export default function PackLanding({ data }: { data: PackData }) {
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
  const nom = (langue === "ar" && data.name_ar) ? data.name_ar : data.name;
  const href = data.buySlug ? `/boutique/${data.buySlug}` : "/contact";

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
          <span className="pl-eyebrow">{t.eyebrow}</span>
          <h1 className="pl-titre"><em>{nom}</em></h1>
          {data.description ? <p className="pl-tagline">{data.description}</p> : null}
          <div className="pl-specs">
            {data.prix ? <span className="pl-spec pl-spec-prix">💳 {fmt(data.prix)} DA</span> : null}
            <span className="pl-spec">🖥️ Sur la plateforme</span>
            <span className="pl-spec">♾️ Accès à vie</span>
          </div>
          <a className="pl-platform-link" href="/formations" target="_blank" rel="noreferrer">{t.platform}</a>
        </div>
      </header>

      <div className="pl-wrap">
        <div className="pl-card">
          <section className="pl-section pl-packbox" style={{ ["--d" as string]: ".05s" }}>
            <h2 className="pl-h2">🎁 {t.packTitle}</h2>
            <p className="pl-lede" style={{ margin: "0 0 14px" }}>{t.packIncludes}</p>

            <div className="pl-pack-duo">
              {data.courses.map((c, i) => (
                <div className="pl-pack-carte" key={c.id || i}>
                  <span className="pl-pack-carte-num">{i + 1}</span>
                  <span className="pl-pack-carte-t">{c.title}</span>
                  {c.prix != null ? <span className="pl-pack-carte-prix">{fmt(Number(c.prix))} DA</span> : null}
                  {c.slug ? (
                    <a className="pl-pack-carte-lien" href={`/boutique/${c.slug}`}>{t.packSee} →</a>
                  ) : null}
                </div>
              ))}
            </div>

            <div className="pl-pack-offre">
              {data.eco > 0 ? (
                <div className="pl-pack-prix">
                  <span className="pl-pack-val">{t.packValue}</span>
                  <span className="pl-pack-cumul">{fmt(data.cumul)} DA</span>
                  <span className="pl-pack-fleche" aria-hidden="true">→</span>
                  <span className="pl-pack-net">{fmt(data.prix)} DA</span>
                </div>
              ) : (
                <div className="pl-pack-prix"><span className="pl-pack-net">{fmt(data.prix)} DA</span></div>
              )}
              {data.eco > 0 ? (
                <div className="pl-pack-eco">{t.economy(`${fmt(data.eco)} DA`)}</div>
              ) : null}
            </div>
          </section>

          <a className="pl-cta" href={href}
            style={{ display: "block", textAlign: "center", textDecoration: "none" }}>
            {data.buySlug ? t.cta : t.ctaContact} →
          </a>

          <p className="pl-pied">{t.pied}</p>
        </div>
      </div>
    </div>
  );
}
