"use client";

import { useEffect, useRef, useState } from "react";
import { Facebook, Film, ImageIcon, PlayCircle } from "lucide-react";
import { isFacebookVideoUrl, sourceLabel, type CommunityItem } from "@/lib/community-types";
import { cdnImage } from "@/lib/storage-cdn";

/** Vrai quand la tuile approche de l'écran (on ne charge rien avant). */
function useVisible<T extends Element>(deja: boolean): [React.RefObject<T>, boolean] {
  const ref = useRef<T>(null);
  const [vu, setVu] = useState(deja);
  useEffect(() => {
    const el = ref.current;
    if (!el || vu) return;
    if (typeof IntersectionObserver === "undefined") { setVu(true); return; }
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVu(true); obs.disconnect(); } }, { rootMargin: "300px" });
    obs.observe(el);
    return () => obs.disconnect();
  }, [vu]);
  return [ref, vu];
}

/**
 * Tuile d'historique de profil : la VRAIE miniature (la photo, la miniature de la vidéo, ou sa 1ʳᵉ image),
 * chargée seulement à l'approche de l'écran ; fond dégradé tant que rien n'est prêt.
 * Un clic ouvre la publication sur place (visionneuse), sans recharger le feed.
 */
export function MediaTile({ item, onOuvrir, prioritaire = false }: {
  item: CommunityItem; onOuvrir: () => void;
  /** Premières tuiles (haut de la grille) : chargées tout de suite, sans attendre le défilement. */
  prioritaire?: boolean;
}) {
  const [ref, visible] = useVisible<HTMLButtonElement>(prioritaire);
  const [miniatureOk, setMiniatureOk] = useState(true);
  const [videoOk, setVideoOk] = useState(true);
  const imgRef = useRef<HTMLImageElement>(null);
  // Une image cassée AVANT l'hydratation ne déclenche jamais onError côté React : on vérifie au montage.
  useEffect(() => {
    const img = imgRef.current;
    if (img && img.complete && img.naturalWidth === 0) setMiniatureOk(false);
  }, []);
  const facebook = item.mediaKind === "video" && isFacebookVideoUrl(item.mediaUrl);
  const video = item.mediaKind === "video" && !facebook;
  // Photo : l'image elle-même ; vidéo : sa miniature (Bunny ou téléversée). Jamais un fichier vidéo dans <img>.
  const image = item.mediaKind === "image" ? cdnImage(item.thumbnail ?? item.mediaUrl) : cdnImage(item.thumbnail);
  // Vidéo sans miniature (ou miniature cassée) : la 1ʳᵉ image du fichier vidéo.
  const premiereImage = video && item.mediaUrl && (!image || !miniatureOk) && videoOk ? `${item.mediaUrl}#t=0.1` : null;

  return (
    <button ref={ref} type="button" onClick={onOuvrir} aria-label={`Ouvrir la publication${item.caption ? ` : ${item.caption.slice(0, 60)}` : ""}`}
      className="relative aspect-[9/16] rounded-lg overflow-hidden block w-full bg-gradient-to-br from-violet-800/50 to-orange-700/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400">
      {image && miniatureOk ? (
        // Le navigateur diffère lui-même les images hors écran (loading="lazy").
        // eslint-disable-next-line @next/next/no-img-element
        <img ref={imgRef} src={image} alt="" loading={prioritaire ? "eager" : "lazy"} decoding="async" onError={() => setMiniatureOk(false)} className="absolute inset-0 w-full h-full object-cover" />
      ) : null}
      {visible && premiereImage ? (
        <video src={premiereImage} muted playsInline preload="metadata" onError={() => setVideoOk(false)}
          className="absolute inset-0 w-full h-full object-cover pointer-events-none" aria-hidden />
      ) : null}
      {facebook ? (
        <span className="absolute inset-0 grid place-items-center bg-[#0b0818]/60"><Facebook size={30} className="text-[#1877F2]" /></span>
      ) : null}
      {video ? (
        <span className="absolute inset-0 grid place-items-center text-white/90 drop-shadow"><PlayCircle size={30} /></span>
      ) : null}
      <span className="absolute top-1.5 left-1.5 text-[9px] font-bold uppercase bg-black/55 text-white px-1.5 py-0.5 rounded">
        {sourceLabel(item.sourceType)}
      </span>
      <span className="absolute bottom-1.5 right-1.5 text-white/90">
        {item.mediaKind === "video" ? <Film size={14} /> : <ImageIcon size={14} />}
      </span>
    </button>
  );
}
