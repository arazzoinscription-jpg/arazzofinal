"use client";

import { useEffect, useState } from "react";
import { X, Play } from "lucide-react";
import type { Practical } from "./lesson-practical";

/**
 * Les travaux des AUTRES élèves de la leçon : une grille de vignettes ; un clic ouvre le travail en grand (photo ou
 * vidéo + son petit mot). Pour s'inspirer et voir ce que les autres ont réalisé.
 */
export function TravauxAutres({ travaux }: { travaux: Practical[] }) {
  const [ouvert, setOuvert] = useState<Practical | null>(null);

  useEffect(() => {
    if (!ouvert) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOuvert(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [ouvert]);

  if (!travaux.length) {
    return <p className="text-sm text-gray-400 font-dm">Personne n’a encore partagé de travail sur cette leçon. Soyez la première ! 🌸</p>;
  }

  return (
    <>
      <p className="text-sm text-gray-500 dark:text-white/50 mb-3">Touchez un travail pour l’ouvrir.</p>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {travaux.map((t) => (
          <button key={t.id} type="button" onClick={() => setOuvert(t)}
            className="relative aspect-square rounded-xl overflow-hidden bg-cream-100 border border-cream-200 text-start">
            {t.photo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={t.photo_url} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
            ) : (
              <video src={`${t.video_url}#t=0.5`} preload="metadata" muted playsInline className="absolute inset-0 w-full h-full object-cover" />
            )}
            {t.video_url ? (
              <span className="absolute inset-0 flex items-center justify-center">
                <span className="w-9 h-9 rounded-full bg-black/55 text-white flex items-center justify-center"><Play size={16} /></span>
              </span>
            ) : null}
            <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent text-white text-[11px] font-semibold px-1.5 py-1 truncate">
              {t.authorName}
            </span>
          </button>
        ))}
      </div>

      {ouvert ? (
        <div role="dialog" aria-modal="true" onClick={() => setOuvert(null)}
          className="fixed inset-0 z-[9998] bg-black/85 flex items-center justify-center p-3">
          <div onClick={(e) => e.stopPropagation()} className="relative w-full max-w-lg">
            <button type="button" onClick={() => setOuvert(null)} aria-label="Fermer"
              className="absolute -top-11 end-0 w-9 h-9 rounded-full bg-white/15 text-white flex items-center justify-center"><X size={18} /></button>
            {ouvert.video_url ? (
              <video src={ouvert.video_url} controls autoPlay playsInline className="w-full max-h-[75vh] rounded-xl bg-black" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={ouvert.photo_url ?? ""} alt="" className="w-full max-h-[75vh] object-contain rounded-xl" />
            )}
            <div className="mt-3 text-white">
              <p className="font-semibold">{ouvert.authorName}</p>
              {ouvert.note ? <p className="text-sm text-white/80 mt-1 whitespace-pre-line">{ouvert.note}</p> : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
