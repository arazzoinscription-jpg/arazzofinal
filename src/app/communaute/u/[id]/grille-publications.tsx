"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Heart, Loader2, MessageCircle, X } from "lucide-react";
import { facebookEmbedSrc, isFacebookVideoUrl, sourceLabel, type CommunityItem } from "@/lib/community-types";
import { cdnImage } from "@/lib/storage-cdn";
import { MediaTile } from "./media-tile";

/** Identifiant Bunny depuis l'URL de lecture (…/<id>/playlist.m3u8). */
function idBunny(hls: string | null): string {
  if (!hls) return "";
  const parts = hls.split("/").filter(Boolean);
  return parts[parts.length - 2] ?? "";
}

/** Le média d'une publication, en grand : photo, vidéo du site, vidéo Bunny ou Facebook. */
function Media({ item, bibliotheque }: { item: CommunityItem; bibliotheque: string }) {
  const [pret, setPret] = useState(false);
  const [illisible, setIllisible] = useState(false);
  const facebook = item.mediaKind === "video" && isFacebookVideoUrl(item.mediaUrl);
  const bunny = item.mediaKind === "video" && !item.mediaUrl && !!item.videoHls;

  if (item.mediaKind === "image") {
    return (
      <>
        {!pret ? <Loader2 className="absolute animate-spin text-white/70" size={36} aria-hidden /> : null}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={cdnImage(item.mediaUrl ?? item.thumbnail ?? "")} alt={item.caption ?? "Publication"} decoding="async"
          onLoad={() => setPret(true)} className="max-w-full max-h-full object-contain" />
      </>
    );
  }
  if (facebook) {
    return <iframe src={facebookEmbedSrc(item.mediaUrl)} title="Vidéo Facebook" allow="autoplay; encrypted-media; picture-in-picture; web-share" allowFullScreen className="w-full h-full" style={{ border: 0 }} />;
  }
  if (bunny && bibliotheque) {
    return (
      <iframe src={`https://iframe.mediadelivery.net/embed/${bibliotheque}/${idBunny(item.videoHls)}?autoplay=true&loop=true&preload=true&responsive=true`}
        title="Vidéo" allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen className="w-full h-full" style={{ border: 0 }} />
    );
  }
  if (!item.mediaUrl) return <p className="text-white/70 text-sm">Vidéo indisponible.</p>;
  return (
    <>
      {!pret && !illisible ? <Loader2 className="absolute animate-spin text-white/70" size={36} aria-hidden /> : null}
      {illisible ? <p className="absolute text-white/80 text-sm px-8 text-center">Cette vidéo ne peut pas être lue sur cet appareil.</p> : null}
      <video src={item.thumbnail ? item.mediaUrl : `${item.mediaUrl}#t=0.1`} poster={item.thumbnail ? cdnImage(item.thumbnail) : undefined}
        autoPlay controls playsInline loop preload="auto"
        onPlaying={() => setPret(true)} onLoadedData={() => setPret(true)} onError={() => setIllisible(true)}
        className="max-w-full max-h-full object-contain" />
    </>
  );
}

/**
 * Historique des publications d'un profil : une grille de vraies miniatures ; un clic ouvre la publication
 * TOUT DE SUITE sur place (rien à recharger), avec précédente / suivante, clavier et glissement.
 * Le bouton « retour » du téléphone ferme la visionneuse au lieu de quitter le profil.
 */
export function GrillePublications({ items, bibliotheque }: { items: CommunityItem[]; bibliotheque: string }) {
  const [ouvert, setOuvert] = useState<number | null>(null);
  const depart = useRef<{ x: number; y: number } | null>(null);
  const entreeHistorique = useRef(false);

  const fermer = useCallback(() => {
    // Si on a ajouté une entrée d'historique en ouvrant, on la retire (le popstate refermera).
    if (entreeHistorique.current) { entreeHistorique.current = false; window.history.back(); return; }
    setOuvert(null);
  }, []);
  const aller = useCallback((d: number) => setOuvert((i) => (i === null ? i : Math.min(items.length - 1, Math.max(0, i + d)))), [items.length]);

  function ouvrir(i: number) {
    setOuvert(i);
    try {
      // Même état que la page (Next.js le reconnaît) + un repère : « retour » referme la visionneuse.
      window.history.pushState({ ...(window.history.state ?? {}), visionneuse: true }, "");
      entreeHistorique.current = true;
    } catch { entreeHistorique.current = false; }
  }

  useEffect(() => {
    const surRetour = () => { if (entreeHistorique.current || ouvert !== null) { entreeHistorique.current = false; setOuvert(null); } };
    window.addEventListener("popstate", surRetour);
    return () => window.removeEventListener("popstate", surRetour);
  }, [ouvert]);

  useEffect(() => {
    if (ouvert === null) return;
    const touche = (e: KeyboardEvent) => {
      if (e.key === "Escape") fermer();
      if (e.key === "ArrowRight") aller(1);
      if (e.key === "ArrowLeft") aller(-1);
    };
    const ancien = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", touche);
    return () => { window.removeEventListener("keydown", touche); document.body.style.overflow = ancien; };
  }, [ouvert, fermer, aller]);

  const item = ouvert === null ? null : items[ouvert];

  return (
    <>
      <div className="grid grid-cols-3 gap-1.5">
        {items.map((it, i) => <MediaTile key={it.id} item={it} prioritaire={i < 6} onOuvrir={() => ouvrir(i)} />)}
      </div>

      {item ? (
        <div role="dialog" aria-modal="true" aria-label="Publication" className="fixed inset-0 z-[80] bg-black flex flex-col"
          onTouchStart={(e) => { depart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; }}
          onTouchEnd={(e) => {
            const d = depart.current; depart.current = null;
            if (!d) return;
            const dx = e.changedTouches[0].clientX - d.x; const dy = e.changedTouches[0].clientY - d.y;
            if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) aller(dx < 0 ? 1 : -1);
            else if (dy > 120 && Math.abs(dy) > Math.abs(dx) * 1.5) fermer();
          }}>
          <div className="flex items-center gap-3 px-3 pt-[max(10px,env(safe-area-inset-top))] pb-2 text-white">
            <button type="button" onClick={fermer} aria-label="Fermer" className="w-10 h-10 grid place-items-center rounded-full bg-white/10 hover:bg-white/20"><X size={20} /></button>
            <span className="text-xs font-bold uppercase bg-white/15 px-2 py-0.5 rounded">{sourceLabel(item.sourceType)}</span>
            <span className="ms-auto text-sm text-white/70">{ouvert! + 1} / {items.length}</span>
          </div>

          <div className="relative flex-1 min-h-0 flex items-center justify-center">
            <Media key={item.id} item={item} bibliotheque={bibliotheque} />
            {ouvert! > 0 ? (
              <button type="button" onClick={() => aller(-1)} aria-label="Publication précédente" className="hidden sm:grid absolute left-3 top-1/2 -translate-y-1/2 w-11 h-11 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20"><ChevronLeft size={24} /></button>
            ) : null}
            {ouvert! < items.length - 1 ? (
              <button type="button" onClick={() => aller(1)} aria-label="Publication suivante" className="hidden sm:grid absolute right-3 top-1/2 -translate-y-1/2 w-11 h-11 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20"><ChevronRight size={24} /></button>
            ) : null}
          </div>

          <div className="px-4 pt-2 pb-[max(14px,env(safe-area-inset-bottom))] text-white">
            {item.caption ? <p className="text-sm text-white/90 font-dm line-clamp-3">{item.caption}</p> : null}
            <div className="mt-1.5 flex items-center gap-4 text-xs text-white/60">
              <span className="inline-flex items-center gap-1"><Heart size={14} aria-hidden /> {item.likeCount}</span>
              <span className="inline-flex items-center gap-1"><MessageCircle size={14} aria-hidden /> {item.commentCount}</span>
              <span className="sm:hidden ms-auto">Glissez ← → pour naviguer</span>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
