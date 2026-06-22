"use client";

import { useRef, useState } from "react";
import * as tus from "tus-js-client";
import { UploadCloud, Loader2, Film, Check } from "lucide-react";
import { startLessonVideo } from "@/app/formateur/cours/lesson-video-actions";

/**
 * Uploader de vidéo de cours vers Bunny Stream (library « cours »).
 * Pas de limite de durée (cours longs). Upload TUS résumable direct vers Bunny.
 * Appelle `onUploaded(embedUrl)` une fois la vidéo téléversée → l'URL est stockée
 * dans `lessons.video_url_bunny`.
 */
export function LessonVideoUploader({
  title,
  currentUrl,
  onUploaded,
}: {
  title?: string;
  currentUrl?: string;
  onUploaded: (embedUrl: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(!!currentUrl);

  function pick(f: File | null) {
    setErr(null); setFile(null); setDone(false);
    if (!f) return;
    if (!f.type.startsWith("video/")) { setErr("Choisissez un fichier vidéo."); return; }
    setFile(f);
  }

  async function upload() {
    if (!file) { setErr("Sélectionnez d'abord une vidéo."); return; }
    setErr(null); setProgress(0);

    const started = await startLessonVideo(title?.slice(0, 200) || file.name);
    if (!started.ok) { setErr(started.error); setProgress(null); return; }
    const { embedUrl, tus: t } = started;

    const up = new tus.Upload(file, {
      endpoint: t.endpoint,
      retryDelays: [0, 1000, 3000, 5000, 10000],
      headers: {
        AuthorizationSignature: t.signature,
        AuthorizationExpire: String(t.expire),
        VideoId: t.videoId,
        LibraryId: t.libraryId,
      },
      metadata: { filetype: file.type, title: title?.slice(0, 200) || file.name },
      onError: (e) => {
        setErr("Échec de l'envoi : " + (e instanceof Error && e.message ? e.message : "réessayez"));
        setProgress(null);
      },
      onProgress: (sent, total) => setProgress(Math.round((sent / total) * 100)),
      onSuccess: () => {
        setProgress(null);
        setDone(true);
        onUploaded(embedUrl);
      },
    });
    up.start();
  }

  const busy = progress !== null;

  return (
    <div className="rounded-lg border border-cream-200 bg-cream-50/50 p-3 space-y-2">
      <div className="flex items-center gap-1.5 text-xs font-medium text-gray-600">
        <Film size={13} className="text-orange-600" /> Vidéo de la leçon
        {done && <span className="ml-auto inline-flex items-center gap-1 text-green-600"><Check size={13} /> Téléversée</span>}
      </div>

      <div className="flex items-center gap-2">
        <input
          ref={fileRef}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={(e) => pick(e.target.files?.[0] ?? null)}
        />
        <button
          type="button"
          onClick={() => !busy && fileRef.current?.click()}
          disabled={busy}
          className="inline-flex items-center gap-1.5 text-xs border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-white disabled:opacity-50"
        >
          <UploadCloud size={14} /> {file ? "Changer" : "Choisir une vidéo"}
        </button>
        {file && !busy && !done && (
          <button
            type="button"
            onClick={upload}
            className="inline-flex items-center gap-1.5 text-xs bg-orange-DEFAULT text-white rounded-lg px-3 py-1.5 font-semibold hover:bg-orange-600"
          >
            <UploadCloud size={14} /> Télécharger sur Bunny
          </button>
        )}
        {file && <span className="text-xs text-gray-400 truncate max-w-[140px]">{file.name}</span>}
      </div>

      {busy && (
        <div className="w-full bg-cream-100 rounded-full h-1.5 overflow-hidden">
          <div className="h-full bg-orange-DEFAULT transition-all" style={{ width: `${progress}%` }} />
        </div>
      )}
      {busy && <p className="text-xs text-gray-500 flex items-center gap-1.5"><Loader2 size={12} className="animate-spin" /> Envoi {progress}%… (ne fermez pas la page)</p>}
      {err && <p className="text-xs text-red-500">{err}</p>}
    </div>
  );
}
