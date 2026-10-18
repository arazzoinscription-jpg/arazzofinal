"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Camera, RefreshCw, X } from "lucide-react";
import { formatVideo } from "@/components/messaging/pieces";
import { useAutorisationMedia } from "@/components/messaging/guide-autorisation";
import { dureeLisible } from "@/lib/stories/regles";
import { STYLE_CADRE, ZONE_CADRE } from "./rendu-calques";

/**
 * La caméra en direct pour une story (ordinateur — sur téléphone, c'est l'appareil photo du téléphone qui s'ouvre) :
 * 📸 prendre une photo, ⏺ filmer (jusqu'à `maxS` secondes ; une vidéo longue devient plusieurs stories).
 * Avant la demande du navigateur : la même explication que la messagerie ; après un refus : le guide pas à pas.
 */
export function CameraStory({ maxS, onFermer, onPhoto, onVideo }: {
  maxS: number;
  onFermer: () => void;
  onPhoto: (f: File) => void;
  onVideo: (f: File, duree: number) => void;
}) {
  const apercu = useRef<HTMLVideoElement>(null);
  const flux = useRef<MediaStream | null>(null);
  const rec = useRef<{ r: MediaRecorder; morceaux: Blob[]; debut: number } | null>(null);
  const [face, setFace] = useState(true);
  const [tentative, setTentative] = useState(0);
  const [pret, setPret] = useState(false);
  const [secondes, setSecondes] = useState<number | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const autorisation = useAutorisationMedia();
  const enCours = secondes !== null;

  // La caméra : explication / guide d'abord, puis l'aperçu (relancée si on change de caméra ou réessaie).
  useEffect(() => {
    let actif = true;
    (async () => {
      setPret(false);
      if (!navigator.mediaDevices?.getUserMedia) { setErreur("Ce navigateur ne permet pas de filmer ici."); return; }
      if (!(await autorisation.preparer("camera", () => setTentative((t) => t + 1)))) return;
      try {
        const f = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: face ? "user" : "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: { echoCancellation: true, noiseSuppression: true },
        });
        if (!actif) { f.getTracks().forEach((t) => t.stop()); return; }
        flux.current?.getTracks().forEach((t) => t.stop());
        flux.current = f;
        setErreur(null);
        if (apercu.current) { apercu.current.srcObject = f; void apercu.current.play().catch(() => {}); }
        setPret(true);
      } catch (e) {
        if (!actif) return;
        const message = autorisation.echec("camera", e, () => setTentative((t) => t + 1));
        if (message) setErreur(message);
      }
    })();
    return () => { actif = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [face, tentative]);

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

  function photo() {
    const v = apercu.current;
    if (!v || !v.videoWidth) return;
    const c = document.createElement("canvas");
    c.width = v.videoWidth; c.height = v.videoHeight;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    // Caméra de face : la photo garde le sens du miroir vu à l'écran.
    if (face) { ctx.translate(c.width, 0); ctx.scale(-1, 1); }
    ctx.drawImage(v, 0, 0, c.width, c.height);
    c.toBlob((b) => {
      if (!b) { setErreur("Photo impossible, réessayez."); return; }
      flux.current?.getTracks().forEach((t) => t.stop());
      onPhoto(new File([b], "photo.jpg", { type: "image/jpeg" }));
    }, "image/jpeg", 0.9);
  }

  function filmer() {
    const f = flux.current;
    if (!f || rec.current) return;
    const format = formatVideo();
    try {
      const r = new MediaRecorder(f, { ...(format ? { mimeType: format } : {}), videoBitsPerSecond: 2_000_000, audioBitsPerSecond: 96_000 });
      const etat = { r, morceaux: [] as Blob[], debut: Date.now() };
      r.ondataavailable = (e) => { if (e.data.size) etat.morceaux.push(e.data); };
      r.onstop = () => {
        rec.current = null;
        const duree = Math.max(1, Math.min(maxS, Math.round((Date.now() - etat.debut) / 1000)));
        const type = (r.mimeType || format || "video/webm").split(";")[0];
        const blob = new Blob(etat.morceaux, { type });
        setSecondes(null);
        if (blob.size < 1000) { setErreur("Vidéo vide, réessayez."); return; }
        flux.current?.getTracks().forEach((t) => t.stop());
        onVideo(new File([blob], `story.${type.includes("mp4") ? "mp4" : "webm"}`, { type }), duree);
      };
      rec.current = etat;
      r.start(1000);
      setSecondes(0);
    } catch {
      setErreur("Ce navigateur ne permet pas de filmer ici.");
    }
  }

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label="Caméra" className="fixed inset-0 z-[90] bg-black text-white flex flex-col">
      <div className="flex items-center gap-2 px-3 pt-[max(12px,env(safe-area-inset-top))] pb-2">
        <button type="button" onClick={() => { if (rec.current) return; onFermer(); }} aria-label="Fermer la caméra" className="w-10 h-10 grid place-items-center rounded-full bg-white/10 hover:bg-white/20"><X size={20} /></button>
        <span className="ms-auto text-sm tabular-nums">{enCours ? <>⏺ {dureeLisible(secondes ?? 0)} <span className="text-white/50">/ {dureeLisible(maxS)}</span></> : null}</span>
      </div>
      <div className="relative flex-1 min-h-0 flex items-center justify-center" style={ZONE_CADRE}>
        <div className="relative overflow-hidden rounded-xl bg-[#111]" style={STYLE_CADRE}>
          <video ref={apercu} muted playsInline autoPlay className={`absolute inset-0 w-full h-full object-cover ${face ? "-scale-x-100" : ""}`} />
          {!pret && !erreur ? <p className="absolute inset-0 grid place-items-center text-sm text-white/70">Ouverture de la caméra…</p> : null}
          {erreur ? <p className="absolute inset-x-4 top-1/2 -translate-y-1/2 rounded-xl bg-red-500/25 border border-red-400/40 px-3 py-2 text-sm text-center">{erreur}</p> : null}
        </div>
      </div>
      <div className="flex items-center justify-center gap-6 px-4 pt-3 pb-[max(16px,env(safe-area-inset-bottom))]">
        <button type="button" onClick={photo} disabled={!pret || enCours} aria-label="Prendre une photo"
          className="w-12 h-12 rounded-full bg-white/15 hover:bg-white/25 grid place-items-center disabled:opacity-30"><Camera size={22} /></button>
        {enCours ? (
          <button type="button" onClick={() => rec.current?.r.stop()} aria-label="Arrêter et utiliser la vidéo"
            className="w-20 h-20 rounded-full border-4 border-white grid place-items-center"><span className="w-8 h-8 rounded-md bg-red-500" /></button>
        ) : (
          <button type="button" onClick={filmer} disabled={!pret} aria-label="Filmer"
            className="w-20 h-20 rounded-full border-4 border-white grid place-items-center disabled:opacity-30"><span className="w-14 h-14 rounded-full bg-red-500" /></button>
        )}
        <button type="button" onClick={() => setFace((f) => !f)} disabled={enCours} aria-label="Changer de caméra"
          className="w-12 h-12 rounded-full bg-white/15 hover:bg-white/25 grid place-items-center disabled:opacity-30"><RefreshCw size={20} /></button>
      </div>
      <p className="pb-3 text-center text-[11px] text-white/50">📷 photo · ⏺ filmer (une vidéo de plus de 30 s devient plusieurs stories)</p>
      {autorisation.rendu}
    </div>,
    document.body,
  );
}
