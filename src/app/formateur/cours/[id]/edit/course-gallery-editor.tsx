"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2, Trash2, Images } from "lucide-react";
import { uploadCourseGallery, removeCourseGalleryImage } from "../../cover-actions";

/**
 * Galerie photos du cours — téléversée ici, affichée dans le carrousel en-tête
 * de la page publique du cours. Upload multiple + suppression, aperçu immédiat.
 */
export function CourseGalleryEditor({ courseId, initial }: { courseId: string; initial: string[] }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [gallery, setGallery] = useState<string[]>(initial);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  async function onFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setMsg(null);
    setBusy(true);
    try {
      const fd = new FormData();
      fd.set("courseId", courseId);
      Array.from(files).forEach((f) => fd.append("images", f));
      const res = await uploadCourseGallery(fd);
      if (res.ok) {
        setGallery(res.gallery);
        setMsg({ type: "ok", text: "Photos ajoutées ✓" });
      } else {
        setMsg({ type: "err", text: res.error });
      }
    } catch {
      setMsg({ type: "err", text: "Échec de l'envoi. Réessayez." });
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function remove(url: string) {
    if (!confirm("Retirer cette photo de la galerie ?")) return;
    setMsg(null);
    // Retrait optimiste
    const prev = gallery;
    setGallery((g) => g.filter((u) => u !== url));
    const res = await removeCourseGalleryImage(courseId, url);
    if (!res.ok) { setGallery(prev); setMsg({ type: "err", text: res.error }); }
    else setGallery(res.gallery);
  }

  return (
    <div className="mt-8">
      <div className="flex items-center gap-2 mb-1">
        <Images size={18} className="text-orange-600" />
        <h2 className="font-playfair text-xl font-bold text-gray-900">Galerie du cours (carrousel)</h2>
      </div>
      <p className="text-sm text-gray-500 mb-4 font-dm">
        Ces photos défilent dans un carrousel en haut de la page publique du cours. Ajoutez plusieurs
        réalisations, détails, étapes… (jusqu'à 15 photos).
      </p>

      <div className="bg-white rounded-2xl p-5 border border-cream-200">
        {gallery.length > 0 && (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mb-4">
            {gallery.map((url) => (
              <div key={url} className="relative group aspect-square rounded-xl overflow-hidden border border-cream-200 bg-cream-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => remove(url)}
                  aria-label="Retirer"
                  className="absolute top-1.5 end-1.5 w-8 h-8 grid place-items-center rounded-full bg-black/55 text-white opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity hover:bg-red-600">
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        )}

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => onFiles(e.target.files)}
          disabled={busy}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="w-full inline-flex items-center justify-center gap-2 border-2 border-dashed border-cream-300 text-gray-600 py-4 rounded-xl font-semibold hover:bg-cream-50 hover:border-orange-300 transition-colors disabled:opacity-60">
          {busy ? <Loader2 size={18} className="animate-spin" /> : <ImagePlus size={18} />}
          {busy ? "Envoi…" : gallery.length ? "Ajouter d'autres photos" : "Téléverser des photos"}
        </button>

        {msg && (
          <p className={`text-sm font-medium mt-3 ${msg.type === "ok" ? "text-green-600" : "text-red-600"}`}>{msg.text}</p>
        )}
      </div>
    </div>
  );
}
