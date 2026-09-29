"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Carrousel « coverflow » 3D de l'en-tête d'un cours — même esprit que celui de
 * /patrons-arazzo. Défile automatiquement toutes les secondes, en pause au survol.
 * Reçoit la liste d'URLs d'images de la galerie du cours.
 */
export function CourseHeroCarousel({ images, title }: { images: string[]; title?: string }) {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const pause = useRef(false);
  const [active, setActive] = useState(0);
  const [spacing, setSpacing] = useState(120);
  const n = images.length;

  useEffect(() => {
    const maj = () => {
      const w = stageRef.current?.offsetWidth ?? 340;
      setSpacing(Math.max(86, Math.min(165, w * 0.34)));
    };
    maj();
    window.addEventListener("resize", maj);
    return () => window.removeEventListener("resize", maj);
  }, []);

  useEffect(() => {
    if (n <= 1) return undefined;
    // Défilement automatique : une image par seconde (comme /patrons-arazzo).
    const id = setInterval(() => { if (!pause.current) setActive((a) => (a + 1) % n); }, 1000);
    return () => clearInterval(id);
  }, [n]);

  const goTo = (k: number) => setActive((((k % n) + n) % n));
  const offsetOf = (k: number) => { let d = (((k - active) % n) + n) % n; if (d > n / 2) d -= n; return d; };

  if (n === 0) return null;

  return (
    <div className="chc-wrap" onMouseEnter={() => { pause.current = true; }} onMouseLeave={() => { pause.current = false; }}>
      <div className="chc-stage" ref={stageRef}>
        {images.map((src, k) => {
          const o = offsetOf(k); const abs = Math.abs(o); const cache = abs > 3;
          return (
            <button
              type="button"
              key={src + k}
              className="chc-card"
              data-active={o === 0 ? "true" : undefined}
              style={{
                transform: `translate(-50%, -50%) translateX(${o * spacing}px) translateZ(${-abs * 70}px) rotateY(${-o * 42}deg) scale(${Math.max(0.6, 1 - abs * 0.16)})`,
                opacity: cache ? 0 : 1 - abs * 0.2,
                zIndex: 100 - abs,
                pointerEvents: cache ? "none" : "auto",
              }}
              onClick={() => goTo(k)}
              aria-label={`${title ?? "Photo"} ${k + 1}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt={`${title ?? ""} ${k + 1}`} loading={k <= 1 ? "eager" : "lazy"} decoding="async" />
            </button>
          );
        })}
      </div>

      {n > 1 && (
        <div className="chc-dots">
          {images.map((src, k) => (
            <button key={src + k} type="button" className="chc-dot" data-on={k === active ? "true" : undefined} onClick={() => goTo(k)} aria-label={`Photo ${k + 1}`} />
          ))}
        </div>
      )}

      <style>{`
        .chc-wrap { position: relative; }
        .chc-stage { position: relative; width: 100%; height: min(300px, 66vw); margin: 0 auto; perspective: 1000px; contain: layout paint; }
        .chc-card { position: absolute; top: 50%; left: 50%; width: min(200px, 52vw); height: min(258px, 64vw); border: none; padding: 0; cursor: pointer; border-radius: 18px; overflow: hidden; background: #ffffff22; box-shadow: 0 10px 24px rgba(0,0,0,.35); transition: transform .5s cubic-bezier(.22,1,.36,1), opacity .45s ease; will-change: transform, opacity; backface-visibility: hidden; }
        .chc-card img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .chc-card[data-active="true"] { box-shadow: 0 22px 54px rgba(0,0,0,.5); outline: 3px solid #FE7223; outline-offset: -1px; }
        .chc-dots { display: flex; justify-content: center; gap: 7px; margin-top: 14px; }
        .chc-dot { width: 8px; height: 8px; border-radius: 999px; border: none; background: #ffffff55; cursor: pointer; padding: 0; transition: width .25s ease, background .25s ease; }
        .chc-dot[data-on="true"] { background: #FE7223; width: 22px; }
      `}</style>
    </div>
  );
}
