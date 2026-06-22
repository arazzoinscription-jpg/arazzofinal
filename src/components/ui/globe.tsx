"use client";

import { useEffect, useRef } from "react";
import createGlobe from "cobe";

/** Villes-clés : Maghreb + diaspora francophone. */
const MARKERS: { location: [number, number]; size: number }[] = [
  { location: [36.7538, 3.0588], size: 0.11 },   // Alger
  { location: [35.6976, -0.6337], size: 0.08 },  // Oran
  { location: [36.365, 6.6147], size: 0.06 },    // Constantine
  { location: [33.5731, -7.5898], size: 0.09 },  // Casablanca
  { location: [34.0209, -6.8416], size: 0.05 },  // Rabat
  { location: [36.8065, 10.1815], size: 0.07 },  // Tunis
  { location: [48.8566, 2.3522], size: 0.07 },   // Paris
  { location: [45.5019, -73.5674], size: 0.05 }, // Montréal
];

/**
 * Globe 3D pointillé interactif (librairie cobe), aux couleurs Arazzo.
 * Rotation automatique + glisser pour tourner ; respecte prefers-reduced-motion.
 */
export function Globe({ className = "" }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointerInteracting = useRef<number | null>(null);
  const pointerMovement = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let width = canvas.offsetWidth || 400;
    let phi = 0;
    let raf = 0;
    const onResize = () => { width = canvas.offsetWidth || width; };
    window.addEventListener("resize", onResize);

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const globe = createGlobe(canvas, {
      devicePixelRatio: 2,
      width: width * 2,
      height: width * 2,
      phi: 0,
      theta: 0.28,
      dark: 1,
      diffuse: 1.15,
      mapSamples: 16000,
      mapBrightness: 6,
      baseColor: [0.45, 0.33, 0.78],      // violet Arazzo
      markerColor: [0.996, 0.447, 0.137], // orange #FE7223
      glowColor: [0.33, 0.18, 0.52],
      markers: MARKERS,
    });

    const tick = () => {
      if (pointerInteracting.current === null && !reduce) phi += 0.004;
      globe.update({ phi: phi + pointerMovement.current, width: width * 2, height: width * 2 });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const t = setTimeout(() => { canvas.style.opacity = "1"; }, 0);
    return () => { clearTimeout(t); cancelAnimationFrame(raf); globe.destroy(); window.removeEventListener("resize", onResize); };
  }, []);

  return (
    <div className={`relative aspect-square w-full ${className}`}>
      <canvas
        ref={canvasRef}
        aria-label="Globe interactif de la communauté Arazzo"
        role="img"
        className="h-full w-full opacity-0 transition-opacity duration-1000 cursor-grab active:cursor-grabbing touch-none"
        onPointerDown={(e) => {
          pointerInteracting.current = e.clientX - pointerMovement.current * 100;
          (e.target as HTMLElement).style.cursor = "grabbing";
        }}
        onPointerUp={(e) => { pointerInteracting.current = null; (e.target as HTMLElement).style.cursor = "grab"; }}
        onPointerOut={(e) => { pointerInteracting.current = null; (e.target as HTMLElement).style.cursor = "grab"; }}
        onMouseMove={(e) => {
          if (pointerInteracting.current !== null) {
            const delta = e.clientX - pointerInteracting.current;
            pointerMovement.current = delta / 100;
          }
        }}
        onTouchMove={(e) => {
          if (pointerInteracting.current !== null && e.touches[0]) {
            const delta = e.touches[0].clientX - pointerInteracting.current;
            pointerMovement.current = delta / 100;
          }
        }}
      />
    </div>
  );
}
