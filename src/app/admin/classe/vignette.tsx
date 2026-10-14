"use client";

import { useEffect, useRef, useState } from "react";

/** Photo d'un travail pratique ; si elle ne se charge pas, on le DIT (et on garde le lien pour l'ouvrir). */
export function VignetteTravail({ src, alt }: { src: string; alt: string }) {
  const [echec, setEchec] = useState(false);
  const img = useRef<HTMLImageElement>(null);
  // Une image en échec AVANT l'activation de React ne déclenche plus onError : on vérifie au montage.
  useEffect(() => {
    const i = img.current;
    if (i && i.complete && i.naturalWidth === 0) setEchec(true);
  }, []);
  if (echec) {
    return (
      <a href={src} target="_blank" rel="noreferrer" className="flex h-full w-full items-center justify-center bg-amber-50 text-[11px] text-amber-800 text-center px-2">
        Image non affichable — ouvrir le lien
      </a>
    );
  }
  return (
    <a href={src} target="_blank" rel="noreferrer" className="block h-full w-full">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img ref={img} src={src} alt={alt} loading="lazy" decoding="async" onError={() => setEchec(true)} className="h-full w-full object-cover" />
    </a>
  );
}
