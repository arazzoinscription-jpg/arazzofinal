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
import { NavLanding } from "@/components/landing/nav-landing";
import LevelTestPopup from "@/lib/level-test-popup";

export type Offre = { slug: string; name: string; sous?: string | null; prix?: string | null; lieu?: "setif" | "eulma"; };

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
    presentiel: "التكوينات الحضورية · سطيف · العلمة", presentielSub: "مركزان · مجموعات صغيرة — اختاري مدينتكِ", setif: "سطيف", eulma: "العلمة",
    patrons: "🧵 باترونات رقمية", presentielCta: "تكوين حضوري",
    pied: "Arazzo · مدرسة الخياطة", toggle: "Français",
    cOnline: "عن بُعد", cOnlineSub: "بالفيديو، من الدار", cPres: "حضوري", cPresSub: "سطيف · العلمة", cPat: "الباترونات الرقمية", cPatSub: "باترونات جاهزة",
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
    presentiel: "Formations en présentiel · Sétif · El Eulma", presentielSub: "Deux centres · petits groupes — choisissez votre ville", setif: "Sétif", eulma: "El Eulma",
    patrons: "🧵 Patronage numérique", presentielCta: "Formation en présentiel",
    pied: "Arazzo · École de couture", toggle: "العربية",
    cOnline: "En ligne", cOnlineSub: "En vidéo, depuis chez vous", cPres: "Présentiel", cPresSub: "Sétif · El Eulma", cPat: "Patronage numérique", cPatSub: "Patrons prêts à l’emploi",
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

export default function OffresHub({ online, packs, presentiel = [], textes }: {
  online: Offre[]; packs: Offre[]; presentiel?: Offre[];
  textes?: { fr?: Record<string, string>; ar?: Record<string, string> };
}) {
  // 09/11 : la page s'ouvre en ARABE ; le français seulement si on appuie sur le bouton de langue (choix gardé).
  const [langue, setLangue] = useState<"ar" | "fr">("ar");
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

  const t = { ...T[langue], ...(textes?.[langue] ?? {}) };

  return (
    <div className="pl" dir={t.dir}>
      <LandingStyles />
      <NavLanding lang={langue} />
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

      {/* 09/11 : la page ne montre QUE 3 grands carrés (en ligne / présentiel / patronage numérique), sans liste de liens. */}
      <div className="pl-wrap">
        <div className="of-carres">
          {[
            { href: "/offres/en-ligne", ico: "💻", nom: t.cOnline, sous: t.cOnlineSub, fond: "linear-gradient(135deg,#5B16F9,#9B6BFF)" },
            { href: "/offres/presentiel", ico: "🏫", nom: t.cPres, sous: t.cPresSub, fond: "linear-gradient(135deg,#128a4c,#4CC38A)" },
            { href: "/patrons-arazzo", ico: "🧵", nom: t.cPat, sous: t.cPatSub, fond: "linear-gradient(135deg,#FE7223,#FFB27A)" },
          ].map((c) => (
            <a key={c.href} href={c.href} className="of-carre" style={{ background: c.fond }}>
              <span className="of-ico" aria-hidden="true">{c.ico}</span>
              <strong>{c.nom}</strong>
              <small>{c.sous}</small>
            </a>
          ))}
        </div>
        <style>{`.of-carres{display:grid;gap:14px;grid-template-columns:1fr;max-width:860px;margin:0 auto}
.of-carre{display:grid;align-content:center;justify-items:center;gap:6px;min-height:180px;border-radius:26px;color:#fff;text-decoration:none;text-align:center;padding:22px;box-shadow:0 18px 34px -20px rgba(30,20,66,.6);transition:transform .18s ease}
.of-carre:hover{transform:translateY(-3px)}
.of-carre strong{font-size:1.7rem;line-height:1.3}
.of-carre small{font-size:1rem;opacity:.92}
.of-ico{font-size:3.4rem;line-height:1}
@media (min-width:700px){.of-carres{grid-template-columns:repeat(3,1fr)}.of-carre{aspect-ratio:1;min-height:0}}`}</style>
      </div>

      {showTest ? (
        <LevelTestPopup slug={testSlug} langue={langue} utm={utmDeLURL()} onClose={() => setShowTest(false)} />
      ) : null}
    </div>
  );
}
