"use client";

import { useRef, useState } from "react";
import * as tus from "tus-js-client";
import { Film, Loader2, X } from "lucide-react";
import { startSurMesureVideo } from "./actions";

/** Upload de la vidéo du modèle vers Bunny Stream (TUS résumable, côté navigateur). */
export function SurMesureVideoUploader({ value, onChange }: { value: string; onChange: (url: string) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function pick(f: File | null) {
    if (!f) return;
    if (!f.type.startsWith("video/")) { setErr("Choisissez un fichier vidéo."); return; }
    setErr(null); setProgress(0);
    const started = await startSurMesureVideo(f.name);
    if (!started.ok) { setErr(started.error); setProgress(null); return; }
    const t = started.tus;
    const up = new tus.Upload(f, {
      endpoint: t.endpoint,
      retryDelays: [0, 1000, 3000, 5000],
      headers: {
        AuthorizationSignature: t.signature,
        AuthorizationExpire: String(t.expire),
        VideoId: t.videoId,
        LibraryId: t.libraryId,
      },
      metadata: { filetype: f.type, title: f.name.slice(0, 120) },
      onError: (e) => { setErr("Échec de l'envoi : " + (e instanceof Error && e.message ? e.message : "réessayez")); setProgress(null); },
      onProgress: (sent, total) => setProgress(Math.round((sent / total) * 100)),
      onSuccess: () => { onChange(started.embedUrl); setProgress(null); if (ref.current) ref.current.value = ""; },
    });
    up.start();
  }

  if (value) {
    return (
      <div className="relative">
        <div className="w-full h-40 rounded-lg overflow-hidden bg-black">
          <iframe src={value} className="w-full h-full" allow="accelerometer;gyroscope;autoplay;encrypted-media;picture-in-picture" allowFullScreen title="Vidéo du modèle" />
        </div>
        <button type="button" onClick={() => onChange("")} className="absolute -top-2 -end-2 bg-white border border-cream-200 rounded-full p-1 shadow text-gray-500 hover:text-red-500"><X size={14} /></button>
      </div>
    );
  }

  const busy = progress !== null;
  return (
    <label className="flex flex-col items-center justify-center gap-1.5 h-40 cursor-pointer text-gray-400 hover:text-orange-500 transition-colors">
      {busy ? <Loader2 size={24} className="animate-spin" /> : <Film size={24} />}
      <span className="text-xs font-semibold">{busy ? `Envoi ${progress}%` : "Ajouter une vidéo"}</span>
      {err && <span className="text-[11px] text-red-500 px-2 text-center">{err}</span>}
      <input ref={ref} type="file" accept="video/*" className="hidden" disabled={busy}
        onChange={(e) => { const f = e.target.files?.[0]; if (f) pick(f); }} />
    </label>
  );
}
