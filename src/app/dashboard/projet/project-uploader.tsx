"use client";

import { useState } from "react";
import { UploadCloud, Loader2, Trash2, Image as ImageIcon, Film } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/components/ui/toast";
import { createProjectUploadUrl, recordProjectMedia, deleteProjectMedia, type ProjectMedia } from "./actions";

/** Téléversement des photos / vidéos du projet de fin de stage + galerie. */
export function ProjectUploader({ initial }: { initial: ProjectMedia[] }) {
  const [items, setItems] = useState<ProjectMedia[]>(initial);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function onPick(files: FileList | null) {
    if (!files || files.length === 0) return;
    setErr(""); setBusy(true);
    try {
      const supabase = createClient();
      for (const f of Array.from(files)) {
        const ext = (f.name.split(".").pop() ?? "").toLowerCase();
        const prep = await createProjectUploadUrl(ext);
        if (!prep.ok) { setErr(prep.error); continue; }
        const { error: upErr } = await supabase.storage.from("posts").uploadToSignedUrl(prep.path, prep.token, f);
        if (upErr) { setErr("Échec de l'envoi d'un fichier."); continue; }
        const rec = await recordProjectMedia(prep.path, prep.kind, f.size);
        if (!rec.ok) { setErr(rec.error); continue; }
        setItems((prev) => [{ id: crypto.randomUUID(), kind: prep.kind, url: rec.url, createdAt: new Date().toISOString() }, ...prev]);
      }
      toast("Projet mis à jour 🎉", "success");
    } catch { setErr("Une erreur est survenue."); }
    finally { setBusy(false); }
  }

  async function remove(id: string) {
    if (!confirm("Supprimer ce média du projet ?")) return;
    const r = await deleteProjectMedia(id);
    if (r.ok) setItems((prev) => prev.filter((x) => x.id !== id));
    else toast(r.error ?? "Erreur", "error");
  }

  return (
    <div className="space-y-5">
      <label className="block">
        <div className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-violet-200 dark:border-white/15 rounded-2xl px-6 py-8 cursor-pointer hover:bg-violet-50/50 dark:hover:bg-white/5 text-center">
          {busy ? <Loader2 size={26} className="text-violet-500 animate-spin" /> : <UploadCloud size={26} className="text-violet-500" />}
          <span className="text-sm font-semibold text-gray-800 dark:text-white/90">Ajouter des photos ou des vidéos</span>
          <span className="text-xs text-gray-400 dark:text-white/50">Images (max 10 Mo) · Vidéos (max 60 Mo) — plusieurs à la fois</span>
          <input type="file" accept="image/*,video/*" multiple className="hidden" disabled={busy}
            onChange={(e) => onPick(e.target.files)} />
        </div>
      </label>

      {err && <p className="text-sm text-red-500 font-dm">{err}</p>}

      {items.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {items.map((m) => (
            <div key={m.id} className="relative group rounded-2xl overflow-hidden border border-cream-200 dark:border-white/10 bg-cream-50 dark:bg-white/[0.03] aspect-square">
              {m.kind === "video" ? (
                <video src={m.url} controls preload="none" className="w-full h-full object-cover" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={m.url} alt="Projet" loading="lazy" className="w-full h-full object-cover" />
              )}
              <span className="absolute top-2 start-2 inline-flex items-center gap-1 text-[10px] font-bold bg-black/55 text-white px-2 py-0.5 rounded-full">
                {m.kind === "video" ? <Film size={11} /> : <ImageIcon size={11} />} {m.kind === "video" ? "Vidéo" : "Photo"}
              </span>
              <button onClick={() => remove(m.id)} aria-label="Supprimer"
                className="absolute top-2 end-2 w-7 h-7 rounded-full bg-black/55 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600">
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
