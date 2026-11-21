"use client";

/**
 * 18/11 — Vitrine PRÉSENTIEL (/offres/presentiel) : concept « atelier de couture ».
 *  · le nom de la ville en GÉANT derrière le titre (on sent le centre) ;
 *  · le choix Sétif / El Eulma = un MÈTRE RUBAN ;
 *  · chaque niveau = une ÉTIQUETTE de vêtement (trou, fil, couture pointillée) qui se balance au survol ;
 *  · ateliers / réparation = des ÉCUSSONS bleu nuit.
 * Identité gardée : logo, violet #5B16F9, bleu nuit #1E1442 (orange #FE7223 seulement à Sétif), Playfair / IBM Plex Sans Arabic.
 * Sétif = violet ; El Eulma (21/11, demande user) = NUDE BEIGE + bleu nuit, motifs en POINTS (pas de rayures),
 * jamais d'orange foncé. Jamais de vert.
 */

import type { Item } from "./offres-liste";

type Lieu = "setif" | "eulma";
const LIEUX: { id: Lieu; fr: string; ar: string }[] = [
  { id: "setif", fr: "Sétif", ar: "سطيف" },
  { id: "eulma", fr: "El Eulma", ar: "العلمة" },
];

const T = {
  ar: {
    eyebrow: "التكوين الحضوري", titre: "تعلّمي الخياطة", titreEm: "في المركز",
    lede: "فوج صغير مع الأستاذة — اختاري مدينتكِ، ومن بعد المستوى.",
    ville: "المدينة", niveaux: "المستويات", ateliers: "ورشات وتكوينات قصيرة",
    voir: "شوفي التفاصيل", aucun: "ما كاش عروض في هذا المركز حاليًا.",
    puces: ["👭 فوج صغير", "👩‍🏫 مع الأستاذة", "🧵 تطبيق على الماشينة"], pied: "Arazzo · مدرسة الخياطة",
  },
  fr: {
    eyebrow: "Formations en présentiel", titre: "Apprenez la couture", titreEm: "au centre",
    lede: "Petits groupes avec la formatrice — choisissez votre ville, puis votre niveau.",
    ville: "Ville", niveaux: "Les niveaux", ateliers: "Ateliers & formations courtes",
    voir: "Voir le détail", aucun: "Aucune offre dans ce centre pour le moment.",
    puces: ["👭 Petits groupes", "👩‍🏫 Avec la formatrice", "🧵 Pratique sur machine"], pied: "Arazzo · École de couture",
  },
};

const estNiveau = (o: Item) => !o.href && !/ورشة|atelier/i.test(`${o.name} ${o.nameAr ?? ""}`);

export default function PresentielVitrine({ items, lieu, setLieu, langue }: {
  items: Item[]; lieu: Lieu; setLieu: (l: Lieu) => void; langue: "ar" | "fr";
}) {
  const t = T[langue];
  const ar = langue === "ar";
  const ici = items.filter((o) => (o.lieu ?? "setif") === lieu);
  const niveaux = ici.filter(estNiveau);
  const autres = ici.filter((o) => !estNiveau(o));
  const ville = LIEUX.find((l) => l.id === lieu)!;
  const lieux = LIEUX.filter((l) => items.some((o) => (o.lieu ?? "setif") === l.id));
  const nom = (o: Item) => (ar && o.nameAr ? o.nameAr : o.name);

  return (
    <div className={`pv pv-${lieu}`}>
      <style>{CSS}</style>

      {/* ── Bandeau : la ville en géant derrière ── */}
      <header className="pv-hero" key={`h-${lieu}`}>
        <span className="pv-geant" aria-hidden="true">{ar ? ville.ar : ville.fr}</span>
        <div className="pv-hero-in">
          <a href="/offres" className="pv-marque">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/arazzo-icon.png" alt="Arazzo" width={42} height={42} />
            <span>Arazzo <em>Formation</em></span>
          </a>
          <p className="pv-eyebrow">🏫 {t.eyebrow} · 📍 {ar ? ville.ar : ville.fr}</p>
          <h1 className="pv-titre">{t.titre} <em>{t.titreEm}</em></h1>
          <p className="pv-lede">{t.lede}</p>
          <ul className="pv-puces">{t.puces.map((p) => <li key={p}>{p}</li>)}</ul>
        </div>
        <div className="pv-metre" aria-hidden="true" />
      </header>

      {/* ── Mètre ruban : Sétif / El Eulma ── */}
      {lieux.length > 1 ? (
        <div className="pv-ruban" role="group" aria-label={t.ville}>
          {LIEUX.map((l) => (
            <button key={l.id} type="button" aria-pressed={lieu === l.id} onClick={() => setLieu(l.id)} className={`pv-ville pv-ville-${l.id}`}>
              <span className="pv-ville-pin">📍</span>
              <span className="pv-ville-nom">{ar ? l.ar : l.fr}</span>
            </button>
          ))}
        </div>
      ) : null}

      <main className="pv-corps" key={`c-${lieu}`}>
        {niveaux.length ? (
          <section>
            <h2 className="pv-h2"><span>{t.niveaux}</span></h2>
            <div className="pv-etiquettes">
              {niveaux.map((o, i) => {
                const [titre, detail] = nom(o).split(" · ");
                return (
                  <a key={o.slug} href={o.href || `/presentiel/${o.slug}`} className="pv-tag" style={{ ["--i" as any]: i }}>
                    <span className="pv-tag-trou" aria-hidden="true" />
                    <span className="pv-tag-num">{String(i + 1).padStart(2, "0")}</span>
                    <strong className="pv-tag-titre">{titre}</strong>
                    {detail ? <span className="pv-tag-detail">{detail}</span> : null}
                    {(ar ? o.prixAr : o.prix) ? <span className="pv-tag-prix">{ar ? o.prixAr : o.prix}</span> : null}
                    <span className="pv-tag-voir">{t.voir} {ar ? "←" : "→"}</span>
                  </a>
                );
              })}
            </div>
          </section>
        ) : null}

        {autres.length ? (
          <section>
            <h2 className="pv-h2"><span>{t.ateliers}</span></h2>
            <div className="pv-ecussons">
              {autres.map((o, i) => (
                <a key={o.slug} href={o.href || `/presentiel/${o.slug}`} className="pv-ecusson" style={{ ["--i" as any]: i + niveaux.length }}>
                  <span className="pv-ecusson-ico" aria-hidden="true">{o.href ? "🛠️" : "🧵"}</span>
                  <span className="pv-ecusson-txt">
                    <strong>{nom(o)}</strong>
                    {(ar ? o.sousAr : o.sous) ? <small>{ar ? o.sousAr : o.sous}</small> : null}
                  </span>
                  {(ar ? o.prixAr : o.prix) ? <span className="pv-ecusson-prix">{ar ? o.prixAr : o.prix}</span> : null}
                  <span className="pv-ecusson-fleche" aria-hidden="true">{ar ? "←" : "→"}</span>
                </a>
              ))}
            </div>
          </section>
        ) : null}

        {!ici.length ? <p className="pv-vide">{t.aucun}</p> : null}
        <p className="pv-pied">{t.pied} — {ar ? ville.ar : ville.fr}</p>
      </main>
    </div>
  );
}

const CSS = `
.pv{--c1:#5B16F9;--c2:#2A0880;--nuit:#1E1442;--acc:#FE7223;--papier:#F7F3FF;--fil:#9B6BFF;
  --serif:"Playfair Display",Georgia,serif;--ar:"IBM Plex Sans Arabic","Segoe UI","Noto Naskh Arabic",sans-serif}
.pl[dir="rtl"] .pv{font-family:var(--ar)}

/* Bandeau */
.pv-hero{position:relative;overflow:hidden;color:#fff;padding:clamp(28px,6vw,64px) 20px clamp(70px,9vw,104px);
  background:radial-gradient(120% 140% at 85% -20%,var(--c1) 0%,var(--c2) 48%,var(--nuit) 100%);animation:pvFondu .5s ease both}
.pv-hero::before{content:"";position:absolute;inset:0;pointer-events:none;opacity:.09;
  background-image:repeating-linear-gradient(-45deg,#fff 0 1.5px,transparent 1.5px 14px)}
.pv-setif .pv-hero::before{background-image:radial-gradient(#fff 1px,transparent 1.5px);background-size:20px 20px}
.pv-geant{position:absolute;inset-inline-end:-.06em;bottom:.02em;font-family:var(--serif);font-weight:800;line-height:.8;
  font-size:clamp(6rem,26vw,17rem);color:transparent;-webkit-text-stroke:2px rgba(255,255,255,.22);white-space:nowrap;
  pointer-events:none;user-select:none;animation:pvGeant .8s cubic-bezier(.2,.7,.2,1) both}
.pl[dir="rtl"] .pv-geant{font-family:var(--ar)}
.pv-hero-in{position:relative;z-index:1;max-width:900px;margin:0 auto}
.pv-hero-in>*{animation:pvMonte .55s cubic-bezier(.2,.7,.2,1) both}
.pv-hero-in>*:nth-child(2){animation-delay:.06s}.pv-hero-in>*:nth-child(3){animation-delay:.12s}
.pv-hero-in>*:nth-child(4){animation-delay:.18s}.pv-hero-in>*:nth-child(5){animation-delay:.24s}
.pv-marque{display:inline-flex;align-items:center;gap:11px;color:#fff;text-decoration:none;font-family:var(--serif);font-weight:700;font-size:1.15rem;margin-bottom:22px}
.pv-marque img{width:42px;height:42px;border-radius:12px;background:#fff;padding:3px;box-shadow:0 8px 18px -8px rgba(0,0,0,.5)}
.pv-marque em{color:var(--acc);font-style:italic}
.pv-eyebrow{display:inline-block;margin:0;padding:7px 14px;border-radius:999px;font-weight:700;font-size:.85rem;
  background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.25);backdrop-filter:blur(4px)}
.pv-titre{margin:16px 0 0;font-family:var(--serif);font-weight:700;line-height:1.08;font-size:clamp(2.3rem,1.2rem + 5vw,4.2rem);max-width:14ch}
.pl[dir="rtl"] .pv-titre{font-family:var(--ar);line-height:1.25}
.pv-titre em{font-style:italic;color:var(--acc)}
.pl[dir="rtl"] .pv-titre em{font-style:normal}
.pv-lede{margin:14px 0 0;max-width:46ch;font-size:clamp(1rem,.95rem + .4vw,1.2rem);line-height:1.6;color:rgba(255,255,255,.9)}
.pv-puces{list-style:none;padding:0;margin:20px 0 0;display:flex;flex-wrap:wrap;gap:8px}
.pv-puces li{font-size:.86rem;font-weight:600;padding:6px 12px;border-radius:999px;background:rgba(30,20,66,.28);border:1px solid rgba(255,255,255,.22)}

/* Mètre ruban sous le bandeau */
.pv-metre{position:absolute;left:0;right:0;bottom:0;height:22px;background-color:#FFD9A8;
  background-image:repeating-linear-gradient(90deg,var(--nuit) 0 2px,transparent 2px 60px),repeating-linear-gradient(90deg,var(--nuit) 0 1px,transparent 1px 12px);
  background-size:100% 14px,100% 7px;background-repeat:repeat-x;background-position:0 0,0 0;border-top:2px solid var(--nuit)}
.pv-setif .pv-metre{background-color:#E9DEFF}

/* Choix de la ville */
.pv-ruban{position:relative;z-index:2;display:grid;grid-template-columns:1fr 1fr;gap:0;max-width:560px;margin:-30px auto 0;
  padding:6px;border-radius:20px;background:#fff;border:2px solid var(--nuit);box-shadow:0 18px 34px -18px rgba(30,20,66,.55)}
.pv-ville{display:flex;align-items:center;justify-content:center;gap:8px;padding:14px 10px;border:0;border-radius:14px;cursor:pointer;
  font:inherit;font-weight:800;font-size:1.2rem;background:transparent;color:var(--nuit);transition:background .25s ease,color .25s ease,transform .15s ease}
.pv-ville:hover{transform:translateY(-1px)}
.pv-ville-setif[aria-pressed="true"]{background:#5B16F9;color:#fff}
.pv-ville[aria-pressed="false"] .pv-ville-pin{filter:grayscale(1);opacity:.5}

/* Corps */
.pv-corps{max-width:960px;margin:0 auto;padding:28px 20px 60px}
.pv-h2{display:flex;align-items:center;gap:14px;margin:26px 0 18px;font-size:1.3rem;font-weight:800;color:var(--ink,#1A1A2E)}
.pv-h2::after{content:"";flex:1;border-top:2px dashed color-mix(in srgb,var(--c1) 55%,transparent)}
.pl:not([dir="rtl"]) .pv-h2 span{font-family:var(--serif)}

/* Étiquettes de vêtement */
.pv-etiquettes{display:grid;gap:26px 18px;grid-template-columns:repeat(auto-fit,minmax(230px,1fr))}
.pv-tag{position:relative;display:grid;align-content:start;gap:6px;padding:46px 22px 22px;margin-top:18px;text-decoration:none;color:var(--nuit);
  background:var(--papier);border-radius:20px 20px 16px 16px;border:2px solid var(--nuit);
  outline:2px dashed color-mix(in srgb,var(--c1) 55%,transparent);outline-offset:-10px;
  box-shadow:0 20px 34px -22px rgba(30,20,66,.6);transform-origin:50% -18px;
  transition:transform .35s cubic-bezier(.3,1.4,.5,1),box-shadow .3s ease;
  animation:pvMonte .55s cubic-bezier(.2,.7,.2,1) both;animation-delay:calc(var(--i,0) * 80ms + .1s)}
.pv-tag:hover{transform:rotate(-2.5deg) translateY(-3px);box-shadow:0 26px 40px -22px rgba(30,20,66,.7)}
.pv-tag-trou{position:absolute;top:14px;left:50%;width:16px;height:16px;margin-left:-8px;border-radius:50%;
  background:var(--bg,#F5F0EB);border:2px solid var(--nuit);box-shadow:inset 0 2px 3px rgba(0,0,0,.2)}
.pv-tag-trou::after{content:"";position:absolute;left:50%;bottom:100%;width:2px;height:34px;margin-left:-1px;
  background:repeating-linear-gradient(180deg,var(--c1) 0 5px,transparent 5px 8px)}
.pv-tag-num{position:absolute;top:10px;inset-inline-start:16px;font-family:var(--serif);font-weight:800;font-style:italic;font-size:2rem;line-height:1;color:var(--c1)}
.pv-tag-titre{font-size:1.55rem;line-height:1.25;font-weight:800}
.pl:not([dir="rtl"]) .pv-tag-titre{font-family:var(--serif)}
.pv-tag-detail{font-weight:700;color:color-mix(in srgb,var(--nuit) 70%,var(--c1))}
.pv-tag-prix{justify-self:start;margin-top:10px;padding:6px 14px;border-radius:8px;font-weight:800;font-size:1.05rem;direction:ltr;unicode-bidi:isolate;
  color:#fff;background:var(--nuit);transform:rotate(-2deg);box-shadow:3px 3px 0 var(--c1)}
.pv-tag-voir{margin-top:8px;font-weight:700;font-size:.9rem;color:var(--c1)}

/* Écussons (ateliers, réparation) */
.pv-ecussons{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(280px,1fr))}
.pv-ecusson{display:flex;align-items:center;gap:14px;padding:14px 16px;border-radius:16px;text-decoration:none;color:#fff;background:var(--nuit);
  border:2px dashed color-mix(in srgb,var(--fil) 70%,transparent);outline:4px solid var(--nuit);outline-offset:0;
  transition:transform .2s ease;animation:pvMonte .55s cubic-bezier(.2,.7,.2,1) both;animation-delay:calc(var(--i,0) * 80ms + .1s)}
.pv-ecusson:hover{transform:translateY(-3px)}
.pv-ecusson-ico{flex:none;display:grid;place-items:center;width:52px;height:52px;border-radius:50%;font-size:1.6rem;background:var(--c1)}
.pv-ecusson-txt{display:grid;gap:3px;flex:1;min-width:0}
.pv-ecusson-txt strong{font-size:1.1rem;line-height:1.3}
.pv-ecusson-txt small{opacity:.8;font-size:.85rem}
.pv-ecusson-prix{flex:none;font-weight:800;direction:ltr;unicode-bidi:isolate;color:var(--fil)}
.pv-ecusson-fleche{flex:none;font-size:1.3rem;color:var(--fil);transition:transform .2s ease}
.pv-ecusson:hover .pv-ecusson-fleche{transform:translateX(4px)}
.pl[dir="rtl"] .pv-ecusson:hover .pv-ecusson-fleche{transform:translateX(-4px)}

.pv-vide{text-align:center;color:var(--ink-3,#8B85A0);padding:30px 0}
.pv-pied{text-align:center;margin-top:40px;color:var(--ink-3,#8B85A0);font-size:.85rem}

/* ── El Eulma : nude beige + bleu nuit, motifs en points (21/11) ── */
.pv-eulma{--c1:#A98467;--c2:#8B6B55;--acc:#1E1442;--papier:#FFFBF7;--fil:#E3CDB9;--nude:#EAD7C7;--nude2:#F6ECE3;
  background-color:#FBF6F1;background-image:radial-gradient(rgba(169,132,103,.22) 1.2px,transparent 1.7px);background-size:18px 18px}
.pv-eulma .pv-hero{color:var(--nuit);background:radial-gradient(70% 90% at 10% 0%,#FFF8F2 0%,transparent 60%),
  linear-gradient(165deg,#F4E6DA 0%,#EAD5C3 55%,#DDBFA8 100%)}
.pv-eulma .pv-hero::before{opacity:.5;background-image:radial-gradient(rgba(30,20,66,.28) 1.3px,transparent 1.8px);background-size:16px 16px}
.pv-eulma .pv-hero::after{content:"";position:absolute;inset:14px;pointer-events:none;border:3px dotted rgba(30,20,66,.3);border-radius:22px}
.pv-eulma .pv-geant{-webkit-text-stroke:2px rgba(139,107,85,.32)}
.pv-eulma .pv-marque{color:var(--nuit)}
.pv-eulma .pv-marque em{color:var(--c2)}
.pv-eulma .pv-eyebrow{background:var(--nuit);border-color:var(--nuit);color:#fff;border-radius:999px}
.pv-eulma .pv-titre em{color:var(--nuit);font-style:italic;text-decoration:underline dotted var(--c1);text-decoration-thickness:.12em;text-underline-offset:.18em}
.pv-eulma .pv-lede{color:color-mix(in srgb,var(--nuit) 80%,transparent)}
.pv-eulma .pv-puces li{background:rgba(255,255,255,.6);border-color:rgba(30,20,66,.15);color:var(--nuit)}
.pv-eulma .pv-metre{background-color:var(--nude)}
.pv-ville-eulma[aria-pressed="true"]{background:var(--nude,#EAD7C7);color:#1E1442;box-shadow:inset 0 0 0 2px #1E1442}
.pv-eulma .pv-h2::after{border-top:3px dotted var(--c1)}
.pv-eulma .pv-tag{border-radius:14px;outline:3px dotted color-mix(in srgb,var(--c1) 60%,transparent);box-shadow:8px 8px 0 var(--nude)}
.pv-eulma .pv-tag:hover{box-shadow:11px 11px 0 var(--c1)}
.pv-eulma .pv-tag-trou::after{background:repeating-linear-gradient(180deg,var(--c1) 0 3px,transparent 3px 7px)}
.pv-eulma .pv-tag-num{color:var(--c1)}
.pv-eulma .pv-tag-prix{background:var(--nuit);box-shadow:3px 3px 0 var(--nude)}
.pv-eulma .pv-tag-voir{color:var(--c2)}
.pv-eulma .pv-ecusson{background:var(--nuit);border:3px dotted var(--fil)}
.pv-eulma .pv-ecusson-ico{background:var(--nude)}
.pv-eulma .pv-ecusson-prix,.pv-eulma .pv-ecusson-fleche{color:var(--fil)}

@keyframes pvMonte{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}
@keyframes pvFondu{from{opacity:.4}to{opacity:1}}
@keyframes pvCraie{from{transform:scaleX(0)}to{transform:scaleX(1)}}
@keyframes pvGeant{from{opacity:0;transform:translateY(30px) scale(.96)}to{opacity:1;transform:none}}
@media (max-width:560px){
  .pv-etiquettes{grid-template-columns:1fr 1fr;gap:22px 12px}
  .pv-tag{padding:40px 12px 14px}
  .pv-tag-titre{font-size:1.15rem}
  .pv-tag-num{font-size:1.5rem;inset-inline-start:10px}
  .pv-tag-detail{font-size:.85rem}
  .pv-tag-prix{font-size:.85rem;padding:5px 9px}
  .pv-tag-voir{font-size:.78rem}
  .pv-ville{font-size:1.05rem;padding:12px 6px}
}
@media (prefers-reduced-motion:reduce){.pv *,.pv-hero{animation:none!important;transition:none!important}}
`;
