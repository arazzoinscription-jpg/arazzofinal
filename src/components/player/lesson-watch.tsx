"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Maximize2, Minimize2, RotateCw } from "lucide-react";
import { useRouter } from "next/navigation";
import type { Player } from "player.js";
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
  prevHref = null,
  nextHref = null,
}: {
  lessonId: string;
  courseId: string;
  videoUrl: string;
  initialPosition: number;
  initialPct: number;
  minPct: number;
  isCompleted: boolean;
  /** Leçon précédente / suivante (déjà filtrées : jamais une leçon verrouillée). */
  prevHref?: string | null;
  nextHref?: string | null;
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

  // ── Mode CINÉMA : après 1 minute de lecture, la vidéo passe en grand (tout l'écran). Sur un téléphone tenu en
  //    vertical (ou rotation bloquée), elle est tournée d'un quart de tour pour remplir l'écran comme en paysage.
  //    Une fois que l'élève le referme, on ne le rouvre plus tout seul pour cette leçon.
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [cinema, setCinema] = useState(false);
  const [tourne, setTourne] = useState(false);
  const tempsLu = useRef(0);
  const dernierT = useRef<number | null>(null);
  const refermeParEleve = useRef(false);
  const portrait = () => typeof window !== "undefined" && window.innerHeight > window.innerWidth;

  // Bloquer l'écran en paysage (Android, en plein écran seulement) ; rend true si le téléphone a accepté.
  const bloquerPaysage = async () => {
    try {
      const o = screen.orientation as unknown as { lock?: (o: string) => Promise<void> } | undefined;
      if (!o?.lock) return false;
      await o.lock("landscape");
      return true;
    } catch { return false; }
  };
  const pleinEcranPar = useRef<"cadre" | null>(null);

  const ouvrirCinema = useCallback(() => {
    setCinema(true);
    // PAS de quart de tour tout de suite : sur Android, le vrai plein écran + paysage arrive juste après. Tourner
    // d'abord la vidéo puis la remettre droite faisait « clignoter » l'écran (vertical → horizontal en une fraction de
    // seconde). On ne tourne la vidéo qu'en dernier recours : plein écran refusé, ou paysage refusé (iPhone…).
    setTourne(false);
    const el = wrapperRef.current as (HTMLDivElement & { webkitRequestFullscreen?: () => void }) | null;
    const secours = () => setTourne(portrait());
    try {
      const p = el?.requestFullscreen?.({ navigationUI: "hide" } as FullscreenOptions);
      if (p && typeof (p as Promise<void>).then === "function") {
        (p as Promise<void>).then(async () => {
          pleinEcranPar.current = "cadre";
          if (!(await bloquerPaysage())) secours();
        }).catch(secours);
      } else secours();
    } catch { secours(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fermerCinema = useCallback(() => {
    refermeParEleve.current = true;
    pleinEcranPar.current = null;
    setCinema(false);
    setTourne(false);
    try { if (document.fullscreenElement) document.exitFullscreen?.(); } catch { /* ignore */ }
    try { (screen.orientation as unknown as { unlock?: () => void })?.unlock?.(); } catch { /* ignore */ }
  }, []);

  // Le plein écran du LECTEUR lui-même (bouton ⛶ dans la vidéo Bunny) : on bloque aussi en paysage, pour que le
  // téléphone ne rebascule pas en vertical. À la sortie du plein écran (bouton retour…), on libère la rotation et on
  // referme le mode cinéma qu'on avait ouvert.
  useEffect(() => {
    const surChangement = () => {
      if (document.fullscreenElement) { void bloquerPaysage(); return; }
      try { (screen.orientation as unknown as { unlock?: () => void })?.unlock?.(); } catch { /* ignore */ }
      if (pleinEcranPar.current === "cadre") {
        pleinEcranPar.current = null;
        refermeParEleve.current = true;
        setCinema(false);
        setTourne(false);
      }
    };
    document.addEventListener("fullscreenchange", surChangement);
    return () => document.removeEventListener("fullscreenchange", surChangement);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Échap ferme ; la rotation suit l'orientation tant que le mode cinéma est ouvert (hors vrai plein écran).
  useEffect(() => {
    if (!cinema) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") fermerCinema(); };
    const onResize = () => { if (!document.fullscreenElement) setTourne(portrait()); };
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
      document.body.style.overflow = "";
    };
  }, [cinema, fermerCinema]);

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
    let cancelled = false;
    // Import DYNAMIQUE : player.js touche `window` au chargement du module → ne doit
    // JAMAIS être importé côté serveur (sinon « ReferenceError: window is not defined »
    // au rendu SSR de la page de leçon). On le charge donc seulement ici, côté client.
    import("player.js")
      .then(({ default: playerjs }) => {
        if (cancelled || !iframeRef.current) return;
        player = new playerjs.Player(iframeRef.current);
        player.on("ready", () => {
          if (initialPosition > 5) player!.setCurrentTime(initialPosition);
          player!.on("timeupdate", (t: { seconds: number; duration: number }) => {
            if (!t) return;
            last.current = { position: t.seconds, duration: t.duration };
            if (t.duration > 0) setPct(Math.min(100, (t.seconds / t.duration) * 100));
            // Temps RÉELLEMENT regardé (sauts ignorés) : à 60 s, la vidéo passe en grand.
            const d = dernierT.current == null ? 0 : t.seconds - dernierT.current;
            dernierT.current = t.seconds;
            if (d > 0 && d < 3) tempsLu.current += d;
            if (tempsLu.current >= 60 && !refermeParEleve.current) {
              refermeParEleve.current = true; // une seule fois tout seul
              ouvrirCinema();
            }
          });
          player!.on("ended", () => { last.current.position = last.current.duration; save(true); setPct(100); });
        });
      })
      .catch(() => { /* player non dispo */ });

    const interval = setInterval(() => save(false), 10000);
    const onHide = () => save(false);
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", onHide);

    return () => {
      cancelled = true;
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
      // Gamification : badges + points + série (après le certificat éventuel)
      supabase.rpc("sync_gamification").then(undefined, () => {});
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
        <div ref={wrapperRef}
          className={`bunny-player-wrapper rounded-2xl overflow-hidden shadow-2xl bg-black${cinema ? " lecteur-cinema" : ""}${cinema && tourne ? " lecteur-tourne" : ""}`}>
          <iframe
            ref={iframeRef}
            src={src}
            loading="lazy"
            allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture; fullscreen; screen-wake-lock"
            allowFullScreen
            title="Lecteur vidéo Arazzo Formation"
          />
          {/* Commandes du mode cinéma (elles tournent avec la vidéo). */}
          {cinema ? (
            <div className="absolute top-2 end-2 z-10 flex items-center gap-2">
              {prevHref ? <Link href={prevHref} className="w-10 h-10 rounded-full bg-black/60 text-white flex items-center justify-center" aria-label="Vidéo précédente"><ChevronLeft size={20} /></Link> : null}
              {nextHref ? <Link href={nextHref} className="w-10 h-10 rounded-full bg-black/60 text-white flex items-center justify-center" aria-label="Vidéo suivante"><ChevronRight size={20} /></Link> : null}
              <button type="button" onClick={() => setTourne((x) => !x)} className="w-10 h-10 rounded-full bg-black/60 text-white flex items-center justify-center" aria-label="Tourner la vidéo"><RotateCw size={18} /></button>
              <button type="button" onClick={fermerCinema} className="w-10 h-10 rounded-full bg-black/60 text-white flex items-center justify-center" aria-label="Réduire"><Minimize2 size={18} /></button>
            </div>
          ) : null}
        </div>
      )}

      {/* Précédente / Suivante + Agrandir */}
      {(prevHref || nextHref || (src && !error)) && (
        <div className="mt-3 flex items-center gap-2">
          {prevHref ? (
            <Link href={prevHref} className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-cream-200 bg-white text-sm font-semibold text-gray-700 hover:bg-cream-50">
              <ChevronLeft size={16} /> Précédente
            </Link>
          ) : <span />}
          {src && !error ? (
            <button type="button" onClick={ouvrirCinema} className="mx-auto inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-violet-200 bg-violet-50 text-sm font-semibold text-violet-700">
              <Maximize2 size={15} /> Plein écran
            </button>
          ) : null}
          {nextHref ? (
            <Link href={nextHref} className="ms-auto inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-orange-DEFAULT text-white text-sm font-semibold hover:bg-orange-600">
              Suivante <ChevronRight size={16} />
            </Link>
          ) : null}
        </div>
      )}

      {/* Barre de visionnage (Bunny seulement) */}
      {isBunny && (
        <div className="mt-4">
          <div className="flex items-center justify-between text-sm mb-1.5">
            <span className="text-gray-500 font-dm">Visionnage</span>
            <span className={`font-bold ${pct >= minPct ? "text-green-600" : "text-orange-600"}`}>
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
              ? "bg-orange-DEFAULT text-white hover:bg-orange-600"
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
