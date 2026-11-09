"use client";

/**
 * Page LISTE d'un service (présentiel OU en ligne) — une page séparée qui montre
 * TOUTES les offres du service, chacune menant à sa propre landing. Même design
 * `pl-` que le hub, bilingue FR/AR. Ouverte depuis les boutons du hub `/offres`.
 */

import { useEffect, useState } from "react";
import { LandingStyles } from "@/lib/landing-kit";
import { NavLanding } from "@/components/landing/nav-landing";

export type Item = { slug: string; name: string; sous?: string | null; prix?: string | null; lieu?: "setif" | "eulma";
  /** 09/11 : nom COURT en arabe (4-5 mots), sous-titre et prix en arabe. */
  nameAr?: string | null; sousAr?: string | null; prixAr?: string | null };

/** Les deux centres de l'école. */
const LIEUX = [
  { id: "setif" as const, fr: "Sétif", ar: "سطيف" },
  { id: "eulma" as const, fr: "El Eulma", ar: "العلمة" },
];

const CLE_LANGUE = "arazzo_formation_langue";

const COULEURS_LIGNE = ["linear-gradient(135deg,#5B16F9,#9B6BFF)", "linear-gradient(135deg,#C2185B,#F06292)", "linear-gradient(135deg,#1E1442,#5B4B9A)"];
const COULEURS_VERT = ["linear-gradient(135deg,#128a4c,#4CC38A)", "linear-gradient(135deg,#0F766E,#2DD4BF)", "linear-gradient(135deg,#3F6212,#84CC16)"];

/** Un grand carré coloré : icône, nom court, une petite ligne, le prix. */
function Carre({ href, ico, nom, sous, prix, fond }: { href: string; ico: string; nom: string; sous?: string | null; prix?: string | null; fond: string }) {
  const [titre, detail] = nom.split(" · ");
  return (
    <a href={href} className="of-carre" style={{ background: fond }}>
      <span className="of-ico" aria-hidden="true">{ico}</span>
      <strong>{titre}</strong>
      {detail ? <em>{detail}</em> : null}
      {sous ? <small>{sous}</small> : null}
      {prix ? <span className="of-prix">{prix}</span> : null}
    </a>
  );
}

const CSS_CARRES = `.of-carres{display:grid;gap:14px;grid-template-columns:1fr;max-width:860px;margin:0 auto 22px}
.of-carre{display:grid;align-content:center;justify-items:center;gap:6px;min-height:200px;border-radius:26px;color:#fff;text-decoration:none;text-align:center;padding:22px;box-shadow:0 18px 34px -20px rgba(30,20,66,.6);transition:transform .18s ease}
.of-carre:hover{transform:translateY(-3px)}
.of-carre strong{font-size:1.7rem;line-height:1.3}
.of-carre em{font-style:normal;font-weight:700;font-size:1.1rem;opacity:.95}
.of-carre small{font-size:.95rem;opacity:.9}
.of-prix{margin-top:6px;background:rgba(255,255,255,.95);color:#1E1442;border-radius:999px;padding:4px 16px;font-weight:800;font-size:1.05rem}
.of-ico{font-size:3.2rem;line-height:1}
.of-h2{max-width:860px;margin:6px auto 12px;font-size:1.4rem}
.of-villes{display:grid;grid-template-columns:1fr 1fr;gap:10px;max-width:860px;margin:0 auto 16px}
.of-ville{border:2px solid #128a4c;background:#fff;color:#128a4c;border-radius:18px;padding:14px;font:inherit;font-weight:800;font-size:1.15rem;cursor:pointer}
.of-ville[aria-pressed="true"]{background:#128a4c;color:#fff}
@media (min-width:700px){.of-carres{grid-template-columns:repeat(3,1fr)}.of-carre{aspect-ratio:1;min-height:0}}`;

const T: Record<"ar" | "fr", any> = {
  ar: {
    dir: "rtl", toggle: "Français", back: "← كل العروض",
    presentiel: { eyebrow: "🏫 حضوري", titre: "التكوين الحضوري", lede: "فوج صغير مع الأستاذة · اختاري مدينتكِ" },
    choisirLieu: "اختاري المدينة", aucunLieu: "لا توجد عروض في هذا المركز حاليًا.",
    online: { eyebrow: "💻 عن بُعد", titre: "التكوين عن بُعد", lede: "بالفيديو، من الدار، وقت ما تحبي" },
    packs: "الحزم بسعر مخفّض", packsSub: "", onlineTitre: "المستويات",
    empty: "لا توجد عروض متاحة حاليًا.", pied: "Arazzo · مدرسة الخياطة",
  },
  fr: {
    dir: "ltr", toggle: "العربية", back: "← Toutes les offres",
    presentiel: { eyebrow: "🏫 Présentiel · Sétif · El Eulma", titre: "Formations en présentiel", lede: "Deux centres : Sétif et El Eulma — choisissez votre ville, puis le niveau qui vous convient." },
    choisirLieu: "Choisissez votre centre", aucunLieu: "Aucune offre dans ce centre pour le moment.",
    online: { eyebrow: "🖥️ En ligne", titre: "Formations en ligne", lede: "Toutes nos formations à distance — sur la plateforme, à votre rythme, accès à vie." },
    packs: "Packs à prix réduit", packsSub: "Deux formations réunies · à prix réduit", onlineTitre: "Formations en ligne",
    empty: "Aucune offre disponible pour le moment.", pied: "Arazzo · École de couture",
  },
};

export default function OffreListe({ kind, items, packs = [], lieu: lieuInitial = null }: {
  kind: "presentiel" | "online"; items: Item[]; packs?: Item[]; lieu?: "setif" | "eulma" | null;
}) {
  // 09/11 : la page s'ouvre en ARABE ; le français seulement si on appuie sur le bouton de langue (choix gardé).
  const [langue, setLangue] = useState<"ar" | "fr">("ar");
  // Présentiel : le centre choisi (Sétif par défaut). Chaque centre a ses offres, ses formulaires, ses prospects.
  const [lieu, setLieuEtat] = useState<"setif" | "eulma">(lieuInitial ?? "setif");
  function choisirLieu(id: "setif" | "eulma") {
    setLieuEtat(id);
    try { window.history.replaceState(null, "", `?lieu=${id}`); } catch { /* ignore */ }
  }

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
  const lieuxPresents = LIEUX.filter((l) => items.some((o) => (o.lieu ?? "setif") === l.id));
  const montres = vert ? items.filter((o) => (o.lieu ?? "setif") === lieu) : items;
  const ar = langue === "ar";
  const nom = (o: Item) => (ar && o.nameAr ? o.nameAr : o.name);

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

      {/* 09/11 : comme /offres — de GRANDS CARRÉS colorés, noms courts, pas de liste de liens. */}
      <div className="pl-wrap">
        {vert && lieuxPresents.length > 1 ? (
          <div className="of-villes" role="group" aria-label={t.choisirLieu}>
            {LIEUX.map((l) => (
              <button key={l.id} type="button" onClick={() => choisirLieu(l.id)} aria-pressed={lieu === l.id} className="of-ville">
                📍 {langue === "ar" ? l.ar : l.fr}
              </button>
            ))}
          </div>
        ) : null}

        {montres.length ? (
          <>
            {kind === "online" && packs.length ? <h2 className="of-h2">🎓 {t.onlineTitre}</h2> : null}
            <div className="of-carres">
              {montres.map((o, i) => (
                <Carre key={o.slug} href={`${base}${o.slug}`} ico={vert ? (/ورشة|atelier/i.test(o.name + (o.nameAr ?? "")) ? "🧵" : "🏫") : ["🌱", "👗", "✨"][i % 3]}
                  nom={nom(o)} sous={ar ? o.sousAr : o.sous} prix={ar ? o.prixAr : o.prix}
                  fond={vert ? COULEURS_VERT[i % COULEURS_VERT.length] : COULEURS_LIGNE[i % COULEURS_LIGNE.length]} />
              ))}
            </div>
          </>
        ) : <p className="pl-note">{vert && items.length ? t.aucunLieu : t.empty}</p>}

        {kind === "online" && packs.length ? (
          <>
            <h2 className="of-h2">🎁 {t.packs}</h2>
            <div className="of-carres">
              {packs.map((o) => (
                <Carre key={o.slug} href={`/pack/${o.slug}`} ico="🎁" nom={nom(o)} sous={ar ? null : o.sous} prix={ar ? o.prixAr : o.prix}
                  fond="linear-gradient(135deg,#FE7223,#FFB27A)" />
              ))}
            </div>
          </>
        ) : null}

        <p className="pl-pied">{t.pied}</p>
        <style>{CSS_CARRES}</style>
      </div>
    </div>
  );
}
