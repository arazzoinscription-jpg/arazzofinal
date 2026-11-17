"use client";

import { useRef, useState } from "react";

/**
 * Médias des landings présentielles (vidéo d'en-tête, photos, séquences de 10 s),
 * montés depuis les vidéos de cours d'Arazzo. Fichiers statiques sous
 * `public/presentiel-medias/<clé>/`. Une offre d'El Eulma (`…-eulma`) reprend
 * les médias de la même offre à Sétif.
 */

type Medias = {
  dossier: string;
  photos: { ar: string; fr: string }[];
  sequences?: { ar: string; fr: string }[];
};

const NIVEAU_PHOTOS = (l: [string, string][]) => l.map(([ar, fr]) => ({ ar, fr }));

const MEDIAS: Record<string, Medias> = {
  "presentiel-niveau-1": {
    dossier: "niveau-1",
    photos: NIVEAU_PHOTOS([
      ["الشرح على السبورة", "Explication au tableau"], ["تحضير القماش", "Préparer le tissu"], ["القص بالمقص", "La coupe"],
      ["الرسم على القماش بالمسطرة", "Tracer sur le tissu"], ["التخييط على الماشينة", "Coudre à la machine"],
      ["الأستاذة ترافقك", "La formatrice vous accompagne"], ["نتعرف على الماشينة", "Connaître la machine"],
    ]),
  },
  "presentiel-niveau-2": {
    dossier: "niveau-2",
    photos: NIVEAU_PHOTOS([
      ["أخذ القياسات", "Prendre les mesures"], ["رسم الباترون", "Tracer le patron"], ["تحضير القماش", "Préparer le tissu"],
      ["تركيب القطع", "Assembler les pièces"], ["الخياطة مع الأستاذة", "Coudre avec la formatrice"], ["الشرح على الماشينة", "Explication à la machine"],
      ["الكورسي على المانكان", "Le corset sur mannequin"], ["الفينيسيون", "Les finitions"],
    ]),
  },
  "presentiel-niveau-3": {
    dossier: "niveau-3",
    photos: NIVEAU_PHOTOS([
      ["الشرح على السبورة", "Explication au tableau"], ["الباترون خطوة بخطوة", "Le patron pas à pas"], ["رسم الموديل على القماش", "Reporter sur le tissu"],
      ["تحضير القطع", "Préparer les pièces"], ["القص على القماش", "Couper le tissu"], ["خياطة الكورسي", "Coudre le corset"], ["التخييط الدقيق", "Couture de précision"],
    ]),
  },
  "utilisation-machine-a-coudre-point-droite": {
    dossier: "atelier-machine",
    photos: NIVEAU_PHOTOS([
      ["الأستاذة تشرح الماشينة", "La formatrice explique la machine"], ["أول خياطة مستقيمة", "Première couture droite"],
      ["السرجيتوز", "La surjeteuse"], ["الأستاذة تصحّح", "La formatrice corrige"], ["تمرين المنحنيات", "Exercice des courbes"],
      ["نصائح الأستاذة", "Les conseils de la formatrice"], ["الضبط والتخييط", "Réglages et couture"],
    ]),
    sequences: NIVEAU_PHOTOS([
      ["الأستاذة تشرح الماشينة للمجموعة", "La formatrice présente la machine"], ["تخييط مستقيم على الماشينة الدروات", "Couture droite"],
      ["السرجيتوز: تخييط القماش", "Surjeteuse sur tissu"], ["الأستاذة تصحّح الطالبة", "La formatrice corrige"],
      ["تمرين المنحنيات على الورق", "Exercice des courbes sur papier"], ["الأستاذة تشرح وتصحّح", "Explication et correction"],
      ["تعمار خيوط السرجيتوز", "Enfiler la surjeteuse"], ["تصحيح الغرزة", "Corriger le point"],
    ]),
  },
};

export function mediasDe(slug: string): Medias | null {
  return MEDIAS[slug.replace(/-eulma$/, "")] ?? null;
}

/** Vidéo d'en-tête (muette au départ, bouton pour le son). */
export function VideoEntete({ slug, ar }: { slug: string; ar: boolean }) {
  const m = mediasDe(slug);
  const ref = useRef<HTMLVideoElement>(null);
  const [son, setSon] = useState(false);
  if (!m) return null;
  const base = `/presentiel-medias/${m.dossier}`;
  return (
    <div className="pm-video">
      <style>{CSS}</style>
      <video ref={ref} src={`${base}/entete.mp4`} poster={`${base}/poster.jpg`} autoPlay muted loop playsInline controls={son} preload="metadata" />
      {!son && (
        <button type="button" className="pm-son" onClick={() => { const v = ref.current; if (!v) return; v.muted = false; v.currentTime = 0; void v.play(); setSon(true); }}>
          {ar ? "🔊 شغّلي الصوت" : "🔊 Activer le son"}
        </button>
      )}
    </div>
  );
}

/** Photos (défilement horizontal) + séquences de 10 s pour l'atelier. */
export function GaleriePresentiel({ slug, ar }: { slug: string; ar: boolean }) {
  const m = mediasDe(slug);
  const [loupe, setLoupe] = useState<number | null>(null);
  if (!m) return null;
  const base = `/presentiel-medias/${m.dossier}`;
  return (
    <section className="pm-bloc">
      <style>{CSS}</style>
      <h2 className="pm-h2">{ar ? "📸 من داخل التكوين" : "📸 Dans la formation"}</h2>
      <div className="pm-rang">
        {m.photos.map((p, i) => (
          <button type="button" key={i} className="pm-photo" onClick={() => setLoupe(i)}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`${base}/photo-${i + 1}.jpg`} alt={ar ? p.ar : p.fr} loading="lazy" width={600} height={1067} />
            <span>{ar ? p.ar : p.fr}</span>
          </button>
        ))}
      </div>
      {m.sequences?.length ? (
        <>
          <h2 className="pm-h2">{ar ? "🎬 الطالبات على الماشينات — 10 ثواني" : "🎬 Les élèves à la machine — 10 secondes"}</h2>
          <div className="pm-rang">
            {m.sequences.map((s, i) => (
              <figure key={i} className="pm-seq">
                <video src={`${base}/seq-${i + 1}.mp4`} poster={`${base}/seq-${i + 1}.jpg`} controls playsInline preload="none" />
                <figcaption>{ar ? s.ar : s.fr}</figcaption>
              </figure>
            ))}
          </div>
        </>
      ) : null}
      {loupe !== null && (
        <div className="pm-loupe" onClick={() => setLoupe(null)} role="dialog">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`${base}/photo-${loupe + 1}.jpg`} alt="" />
          <p>{ar ? m.photos[loupe].ar : m.photos[loupe].fr}</p>
        </div>
      )}
    </section>
  );
}

const CSS = `
.pm-video{position:relative;width:min(300px,78vw);aspect-ratio:9/16;margin:6px auto 16px;border-radius:22px;overflow:hidden;border:3px solid #FE7223;background:#000;box-shadow:0 18px 40px -18px rgba(20,8,60,.7)}
.pm-video video{width:100%;height:100%;object-fit:cover;display:block}
.pm-son{position:absolute;inset:auto 10px 12px 10px;background:rgba(42,8,128,.92);color:#fff;border:2px solid #fff;border-radius:12px;padding:10px;font-weight:700;font-size:1rem;cursor:pointer;font-family:inherit}
.pm-bloc{max-width:1000px;margin:18px auto 64px;padding:0 16px}
.pm-h2{font-size:1.25rem;font-weight:700;color:var(--violet-deep,#2A0880);margin:14px 0 10px;padding-bottom:6px;border-bottom:3px solid #FE7223;display:inline-block}
.pm-rang{display:flex;gap:10px;overflow-x:auto;scroll-snap-type:x mandatory;padding-bottom:8px;-webkit-overflow-scrolling:touch}
.pm-photo,.pm-seq{flex:0 0 150px;scroll-snap-align:start;margin:0}
.pm-photo{position:relative;padding:0;border:none;border-radius:14px;overflow:hidden;cursor:zoom-in;background:#000;aspect-ratio:9/16}
.pm-photo img{width:100%;height:100%;object-fit:cover;display:block}
.pm-photo span{position:absolute;inset:auto 0 0 0;padding:22px 6px 6px;background:linear-gradient(transparent,rgba(20,10,50,.88));color:#fff;font-size:.8rem;line-height:1.4;text-align:center;font-family:inherit}
.pm-seq{flex-basis:170px}
.pm-seq video{width:100%;aspect-ratio:9/16;border-radius:14px;background:#000;display:block;object-fit:cover}
.pm-seq figcaption{font-size:.85rem;font-weight:600;text-align:center;margin-top:4px;color:var(--ink-2,#4A4468)}
.pm-loupe{position:fixed;inset:0;z-index:400;background:rgba(10,5,25,.92);display:grid;place-items:center;padding:16px;cursor:zoom-out}
.pm-loupe img{max-height:82vh;max-width:100%;border-radius:14px}
.pm-loupe p{color:#fff;font-weight:600;text-align:center;margin:10px 0 0}
`;
