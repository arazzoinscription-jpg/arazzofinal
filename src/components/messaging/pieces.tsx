"use client";

import { codeErreur } from "@/lib/autorisations-media";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Pause, Play, X } from "lucide-react";
import { dureeLisible } from "@/lib/messagerie-pieces";

/** Lecteur d'un message vocal (lecture / pause, avancement, durée). */
export function LecteurVocal({ url, duree, mine }: { url: string | null; duree: number | null; mine: boolean }) {
  const audio = useRef<HTMLAudioElement>(null);
  const [lecture, setLecture] = useState(false);
  const [pos, setPos] = useState(0);
  const total = duree ?? 0;
  if (!url) return <span className="text-xs opacity-70">🎤 Message vocal indisponible</span>;
  return (
    <div className="flex items-center gap-2 min-w-[190px]">
      <button type="button" aria-label={lecture ? "Pause" : "Écouter le message vocal"}
        onClick={() => { const a = audio.current; if (!a) return; if (a.paused) void a.play(); else a.pause(); }}
        className={`w-9 h-9 rounded-full grid place-items-center shrink-0 ${mine ? "bg-white/20 text-white" : "bg-[#6B21C8] text-white"}`}>
        {lecture ? <Pause size={16} /> : <Play size={16} className="ms-0.5" />}
      </button>
      <div className="flex-1 min-w-0">
        <div className={`h-1.5 rounded-full overflow-hidden ${mine ? "bg-white/25" : "bg-violet-100 dark:bg-white/15"}`}>
          <div className={`h-full ${mine ? "bg-white" : "bg-[#6B21C8]"}`} style={{ width: `${total ? Math.min(100, (pos / total) * 100) : 0}%` }} />
        </div>
        <div className="mt-1 text-[11px] opacity-75">{dureeLisible(lecture || pos ? pos : total)}</div>
      </div>
      <audio ref={audio} src={url} preload="metadata"
        onPlay={() => setLecture(true)} onPause={() => setLecture(false)}
        onEnded={() => { setLecture(false); setPos(0); }}
        onTimeUpdate={(e) => setPos(e.currentTarget.currentTime)} />
    </div>
  );
}

/** Une photo de la conversation, en grand (toucher pour fermer). */
export function PhotoEnGrand({ url, onFermer }: { url: string; onFermer: () => void }) {
  useEffect(() => {
    const echap = (e: KeyboardEvent) => { if (e.key === "Escape") onFermer(); };
    window.addEventListener("keydown", echap);
    return () => window.removeEventListener("keydown", echap);
  }, [onFermer]);
  return createPortal(
    <div role="dialog" aria-modal="true" aria-label="Photo" className="fixed inset-0 z-[90] bg-black/90 flex items-center justify-center p-3" onClick={onFermer}>
      <button type="button" onClick={onFermer} aria-label="Fermer" className="absolute top-[max(12px,env(safe-area-inset-top))] end-3 p-2 rounded-full bg-white/10 text-white"><X size={22} /></button>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt="Photo de la conversation" className="max-w-full max-h-full object-contain rounded-lg" />
    </div>,
    document.body,
  );
}

/**
 * Photos de téléphone (4 à 12 Mo) : réduites à 1600 px en JPEG avant l'envoi (bien plus rapide en 3G/4G).
 * Si le navigateur ne sait pas lire la photo (ex. HEIC), elle part telle quelle.
 */
export async function compresserImage(f: File, max = 1600, qualite = 0.85): Promise<File> {
  if (!f.type.startsWith("image/") || f.size < 400_000) return f;
  try {
    const url = URL.createObjectURL(f);
    const img = await new Promise<HTMLImageElement>((ok, ko) => { const i = new Image(); i.onload = () => ok(i); i.onerror = ko; i.src = url; });
    URL.revokeObjectURL(url);
    const r = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement("canvas");
    c.width = Math.round(img.naturalWidth * r);
    c.height = Math.round(img.naturalHeight * r);
    c.getContext("2d")?.drawImage(img, 0, 0, c.width, c.height);
    const blob = await new Promise<Blob | null>((ok) => c.toBlob(ok, "image/jpeg", qualite));
    return blob && blob.size < f.size ? new File([blob], f.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" }) : f;
  } catch {
    return f;
  }
}

/** Le meilleur format d'enregistrement du téléphone : WebM/Opus (Android, ordinateur), MP4 (iPhone). */
/**
 * Crée l'enregistreur : d'abord avec le format choisi, et si le téléphone le refuse, avec SON format par défaut
 * (certains iPhone / Android annoncent un format qu'ils n'arrivent pas à ouvrir).
 */
export function creerEnregistreur(flux: MediaStream, options: MediaRecorderOptions): MediaRecorder {
  try {
    return new MediaRecorder(flux, options);
  } catch {
    return new MediaRecorder(flux);
  }
}

export function formatEnregistrement(): string {
  const M = typeof window !== "undefined" ? (window as unknown as { MediaRecorder?: { isTypeSupported?: (t: string) => boolean } }).MediaRecorder : undefined;
  if (!M?.isTypeSupported) return "";
  return ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"].find((t) => M.isTypeSupported!(t)) ?? "";
}

/** Le meilleur format vidéo du téléphone : WebM (Android, ordinateur), MP4 (iPhone). */
export function formatVideo(): string {
  const M = typeof window !== "undefined" ? (window as unknown as { MediaRecorder?: { isTypeSupported?: (t: string) => boolean } }).MediaRecorder : undefined;
  if (!M?.isTypeSupported) return "";
  return ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm", "video/mp4"].find((t) => M.isTypeSupported!(t)) ?? "";
}

/** Anneau d'avancement autour d'un cercle (0 → 1). */
function Anneau({ part, couleur, epaisseur = 4 }: { part: number; couleur: string; epaisseur?: number }) {
  const r = 50 - epaisseur / 2;
  const c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none" aria-hidden>
      <circle cx="50" cy="50" r={r} fill="none" stroke={couleur} strokeWidth={epaisseur} strokeDasharray={c} strokeDashoffset={c * (1 - Math.min(1, Math.max(0, part)))} strokeLinecap="round" />
    </svg>
  );
}

/** Une vidéo ronde « face caméra » dans la conversation : toucher pour lire avec le son, toucher pour mettre en pause. */
export function BulleVideo({ url, duree }: { url: string | null; duree: number | null }) {
  const video = useRef<HTMLVideoElement>(null);
  const [lecture, setLecture] = useState(false);
  const [part, setPart] = useState(0);
  if (!url) return <span className="text-xs opacity-70">🎥 Vidéo indisponible</span>;
  return (
    <button type="button" aria-label={lecture ? "Mettre la vidéo en pause" : "Lire la vidéo"}
      onClick={() => { const v = video.current; if (!v) return; if (v.paused) { v.muted = false; void v.play(); } else v.pause(); }}
      className="relative block w-48 h-48 rounded-full overflow-hidden bg-black">
      <video ref={video} src={url.startsWith("blob:") ? url : `${url}#t=0.1`} playsInline preload="metadata" className="w-full h-full object-cover"
        onPlay={() => setLecture(true)} onPause={() => setLecture(false)}
        onEnded={() => { setLecture(false); setPart(0); }}
        onTimeUpdate={(e) => { const d = Number.isFinite(e.currentTarget.duration) ? e.currentTarget.duration : duree || 1; setPart(e.currentTarget.currentTime / d); }} />
      <Anneau part={part} couleur="#FE7223" />
      {!lecture ? <span className="absolute inset-0 grid place-items-center"><span className="w-12 h-12 rounded-full bg-black/45 text-white grid place-items-center"><Play size={22} className="ms-0.5" /></span></span> : null}
      {duree && !lecture ? <span className="absolute bottom-3 start-1/2 -translate-x-1/2 rounded-full bg-black/55 text-white text-[11px] px-2 py-0.5">{dureeLisible(duree)}</span> : null}
    </button>
  );
}

/**
 * Enregistrer une vidéo ronde (1 min) en se voyant : caméra de face (bascule possible), aperçu en miroir,
 * anneau de temps ; « Envoyer » arrête et envoie, la croix annule (rien n'est envoyé).
 */
export function EnregistreurVideo({ maxS, onFermer, onEnvoyer, onRefus }: {
  maxS: number; onFermer: () => void; onEnvoyer: (f: File, duree: number) => void;
  /** La caméra n'a pas pu s'ouvrir (refus, pas de caméra…) : le guide d'autorisation prend le relais. */
  onRefus?: (erreur: unknown) => void;
}) {
  const apercu = useRef<HTMLVideoElement>(null);
  const flux = useRef<MediaStream | null>(null);
  const rec = useRef<{ r: MediaRecorder; morceaux: Blob[]; debut: number; annule: boolean } | null>(null);
  const [face, setFace] = useState(true);
  const [secondes, setSecondes] = useState<number | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const enCours = secondes !== null;

  // La caméra (relancée si on bascule avant/arrière, jamais pendant l'enregistrement).
  useEffect(() => {
    let actif = true;
    (async () => {
      try {
        const f = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: face ? "user" : "environment", width: { ideal: 480 }, height: { ideal: 480 } },
          audio: { echoCancellation: true, noiseSuppression: true },
        });
        if (!actif) { f.getTracks().forEach((t) => t.stop()); return; }
        flux.current?.getTracks().forEach((t) => t.stop());
        flux.current = f;
        setErreur(null);
        if (apercu.current) { apercu.current.srcObject = f; void apercu.current.play().catch(() => {}); }
      } catch (e) {
        if (!actif) return;
        if (onRefus) { onRefus(e); return; }
        setErreur("Caméra ou micro refusé : autorisez-les pour enregistrer une vidéo.");
      }
    })();
    return () => { actif = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [face]);

  // Fermeture : caméra et micro éteints.
  useEffect(() => () => { flux.current?.getTracks().forEach((t) => t.stop()); }, []);

  // Minuteur + arrêt automatique à la durée maximale.
  useEffect(() => {
    if (!enCours) return;
    const t = window.setInterval(() => {
      const e = rec.current;
      if (!e) return;
      const s = (Date.now() - e.debut) / 1000;
      setSecondes(s);
      if (s >= maxS && e.r.state === "recording") e.r.stop();
    }, 200);
    return () => window.clearInterval(t);
  }, [enCours, maxS]);

  function demarrer() {
    const f = flux.current;
    if (!f || rec.current) return;
    const format = formatVideo();
    try {
      const r = creerEnregistreur(f, { ...(format ? { mimeType: format } : {}), videoBitsPerSecond: 700_000, audioBitsPerSecond: 64_000 });
      const etat = { r, morceaux: [] as Blob[], debut: Date.now(), annule: false };
      r.ondataavailable = (e) => { if (e.data.size) etat.morceaux.push(e.data); };
      r.onstop = () => {
        rec.current = null;
        if (etat.annule) return;
        const duree = Math.max(1, Math.min(maxS, Math.round((Date.now() - etat.debut) / 1000)));
        const type = (r.mimeType || format || "video/webm").split(";")[0];
        const blob = new Blob(etat.morceaux, { type });
        if (blob.size < 1000) { setErreur("Vidéo vide, réessayez."); setSecondes(null); return; }
        flux.current?.getTracks().forEach((t) => t.stop());
        onEnvoyer(new File([blob], `video.${type.includes("mp4") ? "mp4" : "webm"}`, { type }), duree);
        onFermer();
      };
      rec.current = etat;
      try { r.start(500); } catch { rec.current = null; r.start(); rec.current = etat; }
      setSecondes(0);
    } catch (e) {
      rec.current = null;
      setErreur(`Ce téléphone n'arrive pas à enregistrer la vidéo ici (code : ${codeErreur(e)}). Ouvrez le site dans Chrome (Android) ou Safari (iPhone).`);
    }
  }

  function annuler() {
    const e = rec.current;
    if (e) { e.annule = true; if (e.r.state !== "inactive") e.r.stop(); }
    onFermer();
  }

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label="Enregistrer une vidéo" className="fixed inset-0 z-[90] bg-[#0b0818]/95 flex flex-col items-center justify-center gap-6 p-6 text-white">
      <p className="text-sm text-white/80 text-center">{enCours ? "Parlez, on vous écoute…" : "Placez votre visage dans le cercle, puis touchez le bouton rouge."}</p>
      <div className="relative w-64 h-64 sm:w-72 sm:h-72 rounded-full overflow-hidden bg-black ring-4 ring-white/10">
        <video ref={apercu} muted playsInline autoPlay className={`w-full h-full object-cover ${face ? "-scale-x-100" : ""}`} />
        <Anneau part={enCours ? (secondes ?? 0) / maxS : 0} couleur="#FE7223" epaisseur={5} />
      </div>
      <div className="text-lg font-semibold tabular-nums">{dureeLisible(secondes ?? 0)} <span className="text-white/50 text-sm">/ {dureeLisible(maxS)}</span></div>
      {erreur ? <p className="rounded-xl bg-red-500/20 border border-red-400/30 px-3 py-2 text-sm text-center">{erreur}</p> : null}
      <div className="flex items-center gap-6">
        <button type="button" onClick={annuler} aria-label="Annuler" className="w-12 h-12 rounded-full bg-white/10 grid place-items-center"><X size={22} /></button>
        {enCours ? (
          <button type="button" onClick={() => rec.current?.r.stop()} aria-label="Arrêter et envoyer la vidéo"
            className="w-20 h-20 rounded-full bg-[#5B16F9] grid place-items-center text-sm font-bold">Envoyer</button>
        ) : (
          <button type="button" onClick={demarrer} aria-label="Commencer l'enregistrement"
            className="w-20 h-20 rounded-full border-4 border-white grid place-items-center"><span className="w-14 h-14 rounded-full bg-red-500" /></button>
        )}
        <button type="button" onClick={() => setFace((f) => !f)} disabled={enCours} aria-label="Changer de caméra"
          className="w-12 h-12 rounded-full bg-white/10 grid place-items-center text-lg disabled:opacity-30">↺</button>
      </div>
    </div>,
    document.body,
  );
}
