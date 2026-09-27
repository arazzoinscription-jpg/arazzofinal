"use client";

import { useRef, useState } from "react";
import { Upload, Check, AlertTriangle, ImageOff, Loader2 } from "lucide-react";
import { uploadCourseCover } from "../cover-actions";

export type CoverCourse = {
  id: string;
  title: string;
  thumbnail: string | null;
  state: "ok" | "broken" | "missing";
};

function Badge({ state }: { state: CoverCourse["state"] }) {
  if (state === "ok")
    return <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700"><Check size={12} /> Image OK</span>;
  if (state === "broken")
    return <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700"><AlertTriangle size={12} /> Image cassée</span>;
  return <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500"><ImageOff size={12} /> Sans image</span>;
}

function Card({ course }: { course: CoverCourse }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(course.state === "broken" ? null : course.thumbnail);
  const [state, setState] = useState<CoverCourse["state"]>(course.state);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setMsg(null);
    setFileName(file.name);
    // Aperçu immédiat
    const localUrl = URL.createObjectURL(file);
    setPreview(localUrl);
    setBusy(true);
    try {
      const fd = new FormData();
      fd.set("courseId", course.id);
      fd.set("cover", file);
      const res = await uploadCourseCover(fd);
      if (res.ok) {
        setPreview(res.url + "?t=" + Date.now());
        setState("ok");
        setMsg({ type: "ok", text: "Image enregistrée ✓" });
      } else {
        setMsg({ type: "err", text: res.error });
        setPreview(course.state === "broken" ? null : course.thumbnail);
      }
    } catch (e) {
      setMsg({ type: "err", text: "Échec de l'envoi. Réessayez." });
      setPreview(course.state === "broken" ? null : course.thumbnail);
    } finally {
      setBusy(false);
      URL.revokeObjectURL(localUrl);
    }
  }

  return (
    <div className="bg-white dark:bg-white/[0.04] rounded-2xl border border-cream-200 dark:border-white/10 overflow-hidden flex flex-col">
      <div className="aspect-video bg-cream-100 dark:bg-white/5 overflow-hidden relative">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 gap-1">
            <ImageOff size={32} />
            <span className="text-xs">Aucune image</span>
          </div>
        )}
        {busy && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <Loader2 size={28} className="text-white animate-spin" />
          </div>
        )}
      </div>

      <div className="p-4 flex flex-col gap-3 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-gray-900 dark:text-white line-clamp-2 text-sm">{course.title}</h3>
          <div className="shrink-0"><Badge state={state} /></div>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => onFile(e.target.files?.[0])}
          disabled={busy}
        />

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="mt-auto w-full inline-flex items-center justify-center gap-2 bg-orange-DEFAULT text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-orange-600 transition-colors disabled:opacity-60"
        >
          {busy ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
          {busy ? "Envoi…" : state === "ok" ? "Remplacer l'image" : "Téléverser une image"}
        </button>

        {fileName && !msg && <p className="text-xs text-gray-400 truncate">{fileName}</p>}
        {msg && (
          <p className={`text-xs font-medium ${msg.type === "ok" ? "text-green-600" : "text-red-600"}`}>{msg.text}</p>
        )}
      </div>
    </div>
  );
}

export function CoverGrid({ courses }: { courses: CoverCourse[] }) {
  // Ordre : cassées d'abord, puis sans image, puis OK — pour traiter le plus urgent en haut.
  const order = { broken: 0, missing: 1, ok: 2 } as const;
  const sorted = [...courses].sort((a, b) => order[a.state] - order[b.state] || a.title.localeCompare(b.title));

  if (!sorted.length) {
    return <p className="text-gray-400 text-center py-16">Aucun cours à afficher.</p>;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {sorted.map((c) => <Card key={c.id} course={c} />)}
    </div>
  );
}
