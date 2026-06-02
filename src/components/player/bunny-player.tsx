"use client";

import { useEffect, useRef } from "react";

interface BunnyPlayerProps {
  videoUrl: string;
  lessonId: string;
  onComplete?: () => void;
}

/**
 * Résout n'importe quel format de vidéo importé vers une URL d'embed iframe :
 *  - Code HTML complet  <div><iframe src="https://iframe.mediadelivery.net/embed/LIB/UUID?..."></iframe></div>
 *  - URL embed Bunny     https://iframe.mediadelivery.net/embed/LIB/UUID
 *  - URL play Bunny      https://iframe.mediadelivery.net/play/LIB/UUID
 *  - YouTube             https://youtube.com/watch?v=ID  | https://youtu.be/ID
 *  - Vimeo               https://vimeo.com/ID
 * Retourne { src } ou { error } si la valeur n'est pas une vidéo exploitable.
 */
function resolveEmbed(raw: string): { src?: string; error?: string } {
  if (!raw || raw.trim().length === 0) return { error: "empty" };
  const value = raw.trim();

  // 1) Code HTML contenant un <iframe src="...">
  const iframeSrc = value.match(/<iframe[^>]*\ssrc=["']([^"']+)["']/i);
  if (iframeSrc) {
    return { src: decodeHtml(iframeSrc[1]) };
  }

  // 2) Bunny mediadelivery (play → embed)
  const bunny = value.match(/mediadelivery\.net\/(?:embed|play)\/(\d+)\/([\w-]+)/i);
  if (bunny) {
    return {
      src: `https://iframe.mediadelivery.net/embed/${bunny[1]}/${bunny[2]}?autoplay=false&preload=true&responsive=true`,
    };
  }

  // 3) YouTube
  const yt =
    value.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]{6,})/i);
  if (yt) {
    return { src: `https://www.youtube.com/embed/${yt[1]}?rel=0` };
  }

  // 4) Vimeo
  const vimeo = value.match(/vimeo\.com\/(\d+)/i);
  if (vimeo) {
    return { src: `https://player.vimeo.com/video/${vimeo[1]}` };
  }

  // 5) URL embed directe
  if (/^https?:\/\//i.test(value) && /\.(m3u8|mp4)?/.test(value)) {
    if (value.includes("iframe") || value.includes("/embed/")) return { src: value };
  }

  return { error: "unsupported" };
}

function decodeHtml(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

export function BunnyPlayer({ videoUrl, lessonId }: BunnyPlayerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const { src, error } = resolveEmbed(videoUrl);

  useEffect(() => {
    // Place de reprise possible via localStorage (Bunny gère déjà la reprise interne)
    if (typeof window !== "undefined") {
      localStorage.setItem(`last_lesson`, lessonId);
    }
  }, [lessonId]);

  if (error || !src) {
    return (
      <div className="bunny-player-wrapper rounded-2xl overflow-hidden bg-gradient-to-br from-violet-900 to-[#1a1428] flex items-center justify-center">
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
          <div className="text-5xl mb-3">🎬</div>
          <p className="text-white font-playfair text-lg mb-1">
            Vidéo bientôt disponible
          </p>
          <p className="text-violet-300 text-sm font-dm">
            Cette leçon n'a pas encore de vidéo associée.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bunny-player-wrapper rounded-2xl overflow-hidden shadow-2xl bg-black">
      <iframe
        ref={iframeRef}
        src={src}
        loading="lazy"
        allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
        allowFullScreen
        title="Lecteur vidéo Arazzo Formation"
      />
    </div>
  );
}
