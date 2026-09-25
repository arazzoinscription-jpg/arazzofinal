"use client";

/**
 * Hub public « Offres » — MÊME DESIGN que l'OS (kit `pl-` partagé), bilingue
 * FR/AR. Un seul lien à partager (bio TikTok/Instagram) qui présente d'un coup
 * les formations en ligne, les packs et le présentiel.
 *
 * Back-end NATIF : les listes (niveaux, packs) sont lues côté serveur dans
 * Supabase (voir `page.tsx`) et passées en props — aucune dépendance à l'OS.
 */

import { useEffect, useState } from "react";
import { LandingStyles, utmDeLURL } from "@/lib/landing-kit";
import LevelTestPopup from "@/lib/level-test-popup";

export type Offre = { slug: string; name: string; sous?: string | null; prix?: string | null };

const CLE_LANGUE = "arazzo_formation_langue";

const T: Record<"ar" | "fr", any> = {
  ar: {
    dir: "rtl",
    eyebrow: "🌸 عروض التكوين",
    titre: "اختاري تكوينكِ",
    lede: "كل تكويناتنا في مكان واحد — عن بُعد أو حضوريًا بسطيف. اختاري ما يناسبكِ.",
    doTest: "📝 قومي باختبار المستوى",
    bPres: "🏫 تكوينات حضورية", bOnline: "🖥️ تكوينات عن بُعد", bPat: "🧵 باترونات رقمية",
    online: "التكوينات عن بُعد", onlineSub: "عبر المنصّة · بإيقاعك · وصول مدى الحياة",
    packs: "الحزم (Packs) بسعر مخفّض", packsSub: "تكوينان معًا · بسعر مخفّض",
    presentiel: "التكوينات الحضورية بسطيف", presentielSub: "في المركز · مجموعات صغيرة",
    patrons: "🧵 باترونات رقمية", presentielCta: "تكوين حضوري بسطيف",
    pied: "Arazzo · مدرسة الخياطة", toggle: "Français",
  },
  fr: {
    dir: "ltr",
    eyebrow: "🌸 Nos offres de formation",
    titre: "Choisissez votre formation",
    lede: "Toutes nos formations au même endroit — en ligne ou en présentiel à Sétif. Choisissez ce qui vous convient.",
    doTest: "📝 Faire le test de niveau",
    bPres: "🏫 Formations en présentiel", bOnline: "🖥️ Formations en ligne", bPat: "🧵 Patronage numérique",
    online: "Formations en ligne", onlineSub: "Sur la plateforme · à votre rythme · accès à vie",
    packs: "Packs à prix réduit", packsSub: "Deux formations réunies · à prix réduit",
    presentiel: "Formations en présentiel à Sétif", presentielSub: "Au centre · petits groupes",
    patrons: "🧵 Patronage numérique", presentielCta: "Formation en présentiel à Sétif",
    pied: "Arazzo · École de couture", toggle: "العربية",
  },
};

function Carte({ href, icone, name, sous }: { href: string; icone: string; name: string; sous?: string | null }) {
  return (
    <a className="pl-ghost" href={href} style={{ marginBottom: 10 }}>
      <span className="pl-ghost-ico">{icone}</span>
      <span style={{ flex: 1 }}>
        <strong>{name}</strong>
        {sous ? <small>{sous}</small> : null}
      </span>
      <span className="pl-ghost-ico" aria-hidden="true">→</span>
    </a>
  );
}

export default function OffresHub({ online, packs }: { online: Offre[]; packs: Offre[] }) {
  const [langue, setLangue] = useState<"ar" | "fr">("fr");
  const [showTest, setShowTest] = useState(false);
  const testSlug = langue === "ar" ? "niveau-couture-ar" : "niveau-couture";

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

  return (
    <div className="pl" dir={t.dir}>
      <LandingStyles />
      <button type="button" className="pl-langue" onClick={changerLangue} aria-label={t.toggle}>
        🌐 {t.toggle}
      </button>

      <header className="pl-hero">
        <div className="pl-hero-in">
          <div className="pl-marque">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="pl-logo" src="/arazzo-icon.png" alt="Arazzo" width={40} height={40} />
            <span className="pl-marque-nom">Arazzo <em>Formation</em></span>
          </div>
          <span className="pl-eyebrow">{t.eyebrow}</span>
          <h1 className="pl-titre">{t.titre}</h1>
          <p className="pl-tagline">{t.lede}</p>
        </div>
      </header>

      <div className="pl-wrap">
        <div className="pl-card">
          {/* 3 accès rapides — présentiel · en ligne · patronage (comme l'OS). */}
          <div className="pl-actions" style={{ gridTemplateColumns: "1fr 1fr 1fr", marginBottom: 12 }}>
            <a className="pl-ghost pl-ghost-alt" href="#sec-presentiel"
              style={{ borderColor: "#128a4c", background: "color-mix(in srgb, #128a4c 8%, var(--panel))" }}>
              <span style={{ flex: 1, textAlign: "center" }}><strong>{t.bPres}</strong></span>
            </a>
            <a className="pl-ghost" href="#sec-online">
              <span style={{ flex: 1, textAlign: "center" }}><strong>{t.bOnline}</strong></span>
            </a>
            <a className="pl-ghost" href="/patrons-arazzo">
              <span style={{ flex: 1, textAlign: "center" }}><strong>{t.bPat}</strong></span>
            </a>
          </div>

          {/* Test de niveau — ouvre le POPUP (résultat renvoyé au CRM de l'OS). */}
          <button type="button" className="pl-cta" style={{ marginTop: 0 }} onClick={() => setShowTest(true)}>
            {t.doTest}
          </button>

          {/* Les PACKS d'abord (prix réduit). */}
          {packs.length ? (
            <section className="pl-section" style={{ ["--d" as string]: ".05s" }}>
              <h2 className="pl-h2">🎁 {t.packs}</h2>
              <p className="pl-note" style={{ textAlign: "start", marginBottom: 12 }}>{t.packsSub}</p>
              {packs.map((o) => (
                <Carte key={o.slug} href={`/pack/${o.slug}`} icone="🎁" name={o.name} sous={o.prix} />
              ))}
            </section>
          ) : null}

          {/* Formations en ligne. */}
          {online.length ? (
            <section id="sec-online" className="pl-section" style={{ ["--d" as string]: ".09s" }}>
              <h2 className="pl-h2">🖥️ {t.online}</h2>
              <p className="pl-note" style={{ textAlign: "start", marginBottom: 12 }}>{t.onlineSub}</p>
              {online.map((o) => (
                <Carte key={o.slug} href={`/formation/${o.slug}`} icone="🎓" name={o.name}
                  sous={[o.sous, o.prix].filter(Boolean).join(" · ")} />
              ))}
            </section>
          ) : null}

          {/* Présentiel + patronage. */}
          <section id="sec-presentiel" className="pl-section" style={{ ["--d" as string]: ".12s" }}>
            <h2 className="pl-h2">🏫 {t.presentiel}</h2>
            <p className="pl-note" style={{ textAlign: "start", marginBottom: 12 }}>{t.presentielSub}</p>
            <a className="pl-ghost pl-ghost-alt" href="/presentiel/presentiel-niveau-1"
              style={{ marginBottom: 10, borderColor: "#128a4c", background: "color-mix(in srgb, #128a4c 8%, var(--panel))" }}>
              <span className="pl-ghost-ico">🏫</span>
              <span style={{ flex: 1 }}><strong>{t.presentielCta}</strong></span>
              <span className="pl-ghost-ico" aria-hidden="true">→</span>
            </a>
            <Carte href="/patrons-arazzo" icone="🧵" name={t.patrons} />
          </section>

          <p className="pl-pied">{t.pied}</p>
        </div>
      </div>

      {showTest ? (
        <LevelTestPopup slug={testSlug} langue={langue} utm={utmDeLURL()} onClose={() => setShowTest(false)} />
      ) : null}
    </div>
  );
}
