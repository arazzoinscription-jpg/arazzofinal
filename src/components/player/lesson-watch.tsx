"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import playerjs, { Player } from "player.js";
import { createClient } from "@/lib/supabase/client";

/** Résout n'importe quel format vidéo importé → URL d'embed iframe. */
function resolveEmbed(raw: string): { src?: string; error?: boolean } {
  if (!raw || !raw.trim()) return { error: true };
  const v = raw.trim();
  const iframeSrc = v.match(/<iframe[^>]*\ssrc=["']([^"']+)["']/i);
  if (iframeSrc) return { src: decode(iframeSrc[1]) };
  const bunny = v.match(/mediadelivery\.net\/(?:embed|play)\/(\d+)\/([\w-]+)/i);
  if (bunny) return { src: `https://iframe.mediadelivery.net/embed/${bunny[1]}/${bunny[2]}?preload=true&responsive=true` };
  const yt = v.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]{6,})/i);
  if (yt) return { src: `https://www.youtube.com/embed/${yt[1]}?rel=0` };
  if (/^https?:\/\//i.test(v) && (v.includes("/embed/") || v.includes("iframe"))) return { src: v };
  return { error: true };
}
function decode(s: string) {
  return s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#0?39;/g, "'");
}

export function LessonWatch({
  lessonId,
  courseId,
  videoUrl,
  initialPosition,
  initialPct,
  minPct,
  isCompleted,
}: {
  lessonId: string;
  courseId: string;
  videoUrl: string;
  initialPosition: number;
  initialPct: number;
  minPct: number;
  isCompleted: boolean;
}) {
  const router = useRouter();
  const supabase = createClient();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const { src, error } = resolveEmbed(videoUrl);

  const last = useRef({ position: initialPosition, duration: 0 });
  const [pct, setPct] = useState(initialPct);
  const [done, setDone] = useState(isCompleted);
  const [loading, setLoading] = useState(false);
  const isBunny = !!src && src.includes("mediadelivery.net");

  // Sauvegarde de la progression (throttle + à la sortie)
  function save(ended = false) {
    const { position, duration } = last.current;
    if (!duration) return;
    const body = JSON.stringify({ lessonId, position, duration, ended });
    try {
      if (navigator.sendBeacon) {
        navigator.sendBeacon("/api/video-progress", new Blob([body], { type: "application/json" }));
      } else {
        fetch("/api/video-progress", { method: "POST", body, headers: { "Content-Type": "application/json" }, keepalive: true });
      }
    } catch { /* silencieux */ }
  }

  // Player.js : reprise + suivi du temps (Bunny uniquement)
  useEffect(() => {
    if (!isBunny || !iframeRef.current) return;
    let player: Player | null = null;
    try {
      player = new playerjs.Player(iframeRef.current);
      player.on("ready", () => {
        if (initialPosition > 5) player!.setCurrentTime(initialPosition);
        player!.on("timeupdate", (t: { seconds: number; duration: number }) => {
          if (!t) return;
          last.current = { position: t.seconds, duration: t.duration };
          if (t.duration > 0) setPct(Math.min(100, (t.seconds / t.duration) * 100));
        });
        player!.on("ended", () => { last.current.position = last.current.duration; save(true); setPct(100); });
      });
    } catch { /* player non dispo */ }

    const interval = setInterval(() => save(false), 10000);
    const onHide = () => save(false);
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", onHide);

    return () => {
      save(false);
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", onHide);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isBunny, lessonId]);

  const canComplete = done || !isBunny || pct >= minPct;

  async function toggleComplete() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    if (done) {
      await supabase.from("progress").delete().eq("user_id", user.id).eq("lesson_id", lessonId);
      setDone(false);
    } else {
      await supabase.from("progress").upsert({ user_id: user.id, lesson_id: lessonId, completed_at: new Date().toISOString() });
      setDone(true);
      // Vérifier la complétion du cours → certificat
      fetch("/api/certificates/check", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId }),
      }).catch(() => {});
    }
    setLoading(false);
    router.refresh();
  }

  return (
    <div>
      {/* Lecteur */}
      {error || !src ? (
        <div className="bunny-player-wrapper rounded-2xl overflow-hidden bg-gradient-to-br from-violet-900 to-[#1a1428]">
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
            <div className="text-5xl mb-3">🎬</div>
            <p className="text-white font-playfair text-lg">Vidéo bientôt disponible</p>
          </div>
        </div>
      ) : (
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
      )}

      {/* Barre de visionnage (Bunny seulement) */}
      {isBunny && (
        <div className="mt-4">
          <div className="flex items-center justify-between text-sm mb-1.5">
            <span className="text-gray-500 font-dm">Visionnage</span>
            <span className={`font-bold ${pct >= minPct ? "text-green-600" : "text-violet-DEFAULT"}`}>
              {Math.round(pct)}% {pct >= minPct && "✓"}
            </span>
          </div>
          <div className="h-2 bg-cream-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-violet-500 to-orange-DEFAULT rounded-full transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
          {!canComplete && (
            <p className="text-xs text-gray-400 mt-1.5 font-dm">
              Regardez au moins <strong>{minPct}%</strong> de la vidéo pour valider la leçon.
            </p>
          )}
        </div>
      )}

      {/* Bouton de validation */}
      <div className="mt-5">
        <button
          onClick={toggleComplete}
          disabled={loading || !canComplete}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold transition-all ${
            done
              ? "bg-green-100 text-green-700 border border-green-300"
              : canComplete
              ? "bg-violet-DEFAULT text-white hover:bg-violet-700"
              : "bg-gray-100 text-gray-400 cursor-not-allowed"
          }`}
        >
          {loading ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          ) : done ? "✅" : "☐"}
          {done ? "Leçon terminée" : canComplete ? "Marquer comme terminée" : `Regardez ${minPct}% pour valider`}
        </button>
      </div>
    </div>
  );
}
