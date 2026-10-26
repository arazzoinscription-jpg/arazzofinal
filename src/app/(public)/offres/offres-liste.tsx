"use client";

/**
 * Page LISTE d'un service (présentiel OU en ligne) — une page séparée qui montre
 * TOUTES les offres du service, chacune menant à sa propre landing. Même design
 * `pl-` que le hub, bilingue FR/AR. Ouverte depuis les boutons du hub `/offres`.
 */

import { useEffect, useState } from "react";
import { LandingStyles } from "@/lib/landing-kit";
import { NavLanding } from "@/components/landing/nav-landing";

export type Item = { slug: string; name: string; sous?: string | null; prix?: string | null; lieu?: "setif" | "eulma" };

/** Les deux centres de l'école. */
const LIEUX = [
  { id: "setif" as const, fr: "Sétif", ar: "سطيف" },
  { id: "eulma" as const, fr: "El Eulma", ar: "العلمة" },
];

const CLE_LANGUE = "arazzo_formation_langue";

const T: Record<"ar" | "fr", any> = {
  ar: {
    dir: "rtl", toggle: "Français", back: "← كل العروض",
    presentiel: { eyebrow: "🏫 تكوينات حضورية · سطيف · العلمة", titre: "التكوينات الحضورية", lede: "مركزان: سطيف والعلمة — اختاري مدينتكِ، ثم المستوى الذي يناسبكِ." },
    choisirLieu: "اختاري المركز", aucunLieu: "لا توجد عروض في هذا المركز حاليًا.",
    online: { eyebrow: "🖥️ تكوينات عن بُعد", titre: "التكوينات عن بُعد", lede: "كل تكويناتنا عن بُعد — عبر المنصّة، بإيقاعكِ، وصول مدى الحياة." },
    packs: "الحزم (Packs) بسعر مخفّض", packsSub: "تكوينان معًا · بسعر مخفّض", onlineTitre: "التكوينات عن بُعد",
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
  const [langue, setLangue] = useState<"ar" | "fr">("fr");
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

  return (
    <div className="pl" dir={t.dir}>
      <LandingStyles />
      <NavLanding />
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

          {/* Packs à prix réduit (en ligne) — chacun → sa page /pack/[slug] avec le détail. */}
          {kind === "online" && packs.length ? (
            <section className="pl-section" style={{ marginBottom: 8 }}>
              <h2 className="pl-h2">🎁 {t.packs}</h2>
              <p className="pl-note" style={{ textAlign: "start", marginBottom: 12 }}>{t.packsSub}</p>
              {packs.map((o) => (
                <a key={o.slug} className="pl-ghost" href={`/pack/${o.slug}`} style={{ marginBottom: 10 }}>
                  <span className="pl-ghost-ico">🎁</span>
                  <span style={{ flex: 1 }}>
                    <strong>{o.name}</strong>
                    {[o.sous, o.prix].filter(Boolean).length ? <small>{[o.sous, o.prix].filter(Boolean).join(" · ")}</small> : null}
                  </span>
                  <span className="pl-ghost-ico" aria-hidden="true">→</span>
                </a>
              ))}
            </section>
          ) : null}

          {kind === "online" && packs.length ? (
            <h2 className="pl-h2" style={{ marginTop: 6 }}>🖥️ {t.onlineTitre}</h2>
          ) : null}

          {vert && lieuxPresents.length > 1 ? (
            <section className="pl-section" style={{ marginBottom: 6 }}>
              <h2 className="pl-h2">📍 {t.choisirLieu}</h2>
              <div className="pl-actions" style={{ gridTemplateColumns: "1fr 1fr", marginBottom: 12 }}>
                {LIEUX.map((l) => (
                  <button key={l.id} type="button" className="pl-ghost pl-ghost-alt" onClick={() => choisirLieu(l.id)}
                    aria-pressed={lieu === l.id}
                    style={lieu === l.id
                      ? { justifyContent: "center", borderColor: "#128a4c", background: "#128a4c", color: "#fff", fontWeight: 800 }
                      : { justifyContent: "center", borderColor: "#128a4c", background: "color-mix(in srgb, #128a4c 8%, var(--panel))" }}>
                    <span style={{ flex: 1, textAlign: "center" }}><strong>📍 {langue === "ar" ? l.ar : l.fr}</strong></span>
                  </button>
                ))}
              </div>
            </section>
          ) : null}

          {montres.length ? montres.map((o) => (
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
          )) : <p className="pl-note">{vert && items.length ? t.aucunLieu : t.empty}</p>}

          <p className="pl-pied">{t.pied}</p>
        </div>
      </div>
    </div>
  );
}
