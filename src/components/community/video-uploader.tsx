"use client";

import { useRef, useState } from "react";
import * as tus from "tus-js-client";
import { UploadCloud, Loader2, Film } from "lucide-react";
import { startCommunityVideo, finalizeCommunityVideo } from "@/app/actions/community-upload";
import { toast } from "@/components/ui/toast";

type Source = "admin" | "course_teaser" | "patron_demo";

const MAX_SECONDS = 180; // 3 minutes

/** Uploader de vidéo communauté (0–3 min) vers Bunny Stream via TUS résumable. */
export function CommunityVideoUploader({
  sourceType, courseId, patronId, onDone,
}: {
  sourceType: Source; courseId?: string; patronId?: string; onDone?: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [duration, setDuration] = useState<number | null>(null);
  const [caption, setCaption] = useState("");
  const [progress, setProgress] = useState<number | null>(null);
  const [err, setErr] = useState<string | null>(null);

  function pick(f: File | null) {
    setErr(null); setDuration(null); setFile(null);
    if (!f) return;
    if (!f.type.startsWith("video/")) { setErr("Choisissez un fichier vidéo."); return; }
    const v = document.createElement("video");
    v.preload = "metadata";
    v.onloadedmetadata = () => {
      URL.revokeObjectURL(v.src);
      const d = Math.round(v.duration);
      if (!d || d < 1) { setErr("Vidéo illisible."); return; }
      if (d > MAX_SECONDS) { setErr(`Vidéo trop longue (${d}s) — maximum 3 minutes (180s).`); return; }
      setDuration(d); setFile(f);
    };
    v.onerror = () => setErr("Impossible de lire cette vidéo.");
    v.src = URL.createObjectURL(f);
  }

  async function upload() {
    if (!file || !duration) { setErr("Sélectionnez d'abord une vidéo valide."); return; }
    setErr(null); setProgress(0);

    const started = await startCommunityVideo({
      sourceType, courseId: courseId ?? null, patronId: patronId ?? null, title: caption.slice(0, 120),
    });
    if (!started.ok) { setErr(started.error); setProgress(null); return; }
    const { videoId, tus: t } = started;

    const up = new tus.Upload(file, {
      endpoint: t.endpoint,
      retryDelays: [0, 1000, 3000, 5000],
      headers: {
        AuthorizationSignature: t.signature,
        AuthorizationExpire: String(t.expire),
        VideoId: t.videoId,
        LibraryId: t.libraryId,
      },
      metadata: { filetype: file.type, title: caption.slice(0, 120) || "Vidéo communauté" },
      onError: (e) => { setErr("Échec de l'envoi : " + (e instanceof Error && e.message ? e.message : "réessayez")); setProgress(null); },
      onProgress: (sent, total) => setProgress(Math.round((sent / total) * 100)),
      onSuccess: async () => {
        const fin = await finalizeCommunityVideo({
          videoId, sourceType, caption, durationSeconds: duration!,
          courseId: courseId ?? null, patronId: patronId ?? null,
        });
        if (fin.ok) {
          toast("Vidéo publiée sur la communauté 🎉", "success");
          setFile(null); setDuration(null); setCaption(""); setProgress(null);
          if (fileRef.current) fileRef.current.value = "";
          onDone?.();
        } else { setErr(fin.error); setProgress(null); }
      },
    });
    up.start();
  }

  const busy = progress !== null;

  return (
    <div className="bg-white rounded-2xl border border-cream-200 p-5 space-y-4">
      <div className="flex items-center gap-2 text-gray-900">
        <Film size={18} className="text-orange-600" />
        <h3 className="font-semibold">Publier une vidéo sur la communauté</h3>
      </div>

      <div
        onClick={() => !busy && fileRef.current?.click()}
        className="border-2 border-dashed border-cream-300 rounded-xl p-6 text-center cursor-pointer hover:bg-cream-50 transition-colors">
        <input ref={fileRef} type="file" accept="video/*" className="hidden"
          onChange={(e) => pick(e.target.files?.[0] ?? null)} />
        <UploadCloud className="mx-auto text-gray-400 mb-2" size={28} />
        {file ? (
          <p className="text-sm text-gray-700 font-dm">{file.name} {duration ? `· ${duration}s` : ""}</p>
        ) : (
          <p className="text-sm text-gray-500 font-dm">Cliquez pour choisir une vidéo (max 3 minutes)</p>
        )}
      </div>

      <textarea value={caption} onChange={(e) => setCaption(e.target.value)} rows={2}
        placeholder="Légende (optionnel)…" disabled={busy}
        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none" />

      {err && <p className="text-sm text-red-500">{err}</p>}

      {progress !== null && (
        <div className="w-full bg-cream-100 rounded-full h-2 overflow-hidden">
          <div className="h-full bg-orange-DEFAULT transition-all" style={{ width: `${progress}%` }} />
        </div>
      )}

      <button onClick={upload} disabled={!file || !duration || busy}
        className="inline-flex items-center gap-2 bg-orange-DEFAULT text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-orange-600 disabled:opacity-50 transition-colors">
        {busy ? <><Loader2 size={16} className="animate-spin" /> Envoi {progress}%</> : <><UploadCloud size={16} /> Publier la vidéo</>}
      </button>
    </div>
  );
}
