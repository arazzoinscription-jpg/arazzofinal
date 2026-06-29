"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Ruler, Loader2, Check, ImagePlus, X } from "lucide-react";
import { placeCustomOrder } from "./actions";
import { MESURE_FIELDS } from "./constants";
import { createClient } from "@/lib/supabase/client";
import { SurMesureVideoUploader } from "./video-uploader";

const field = "w-full rounded-xl border border-cream-200 dark:border-white/15 bg-white dark:bg-white/5 px-3.5 py-2.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500";
const label = "block text-sm font-medium text-gray-700 dark:text-white/80 mb-1.5";

export function CustomOrderForm({ type = "patron" }: { type?: "patron" | "placement" }) {
  const isPlacement = type === "placement";
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [photoUrl, setPhotoUrl] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [busyMedia, setBusyMedia] = useState<"photo" | "video" | null>(null);
  const router = useRouter();

  // Upload DIRECT navigateur → Supabase Storage (bucket public `practicals`, dossier sur-mesure/).
  // Évite la limite ~4,5 Mo des Server Actions → gère photo ET vidéo de n'importe quelle taille.
  async function uploadMedia(file: File, kind: "photo" | "video") {
    setError(null);
    setBusyMedia(kind);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setError("Veuillez vous connecter."); return; }
      const ext = (file.name.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5) || "bin";
      const path = `sur-mesure/${user.id}/${kind}-${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("practicals").upload(path, file, { upsert: false, contentType: file.type || undefined });
      if (upErr) { setError("Envoi échoué : " + upErr.message); return; }
      const url = supabase.storage.from("practicals").getPublicUrl(path).data.publicUrl;
      if (kind === "photo") setPhotoUrl(url); else setVideoUrl(url);
    } finally {
      setBusyMedia(null);
    }
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    fd.set("photo_url", photoUrl);
    fd.set("video_url", videoUrl);
    const formEl = e.currentTarget;
    start(async () => {
      const res = await placeCustomOrder(fd);
      if (res.ok) { setDone(true); formEl.reset(); setPhotoUrl(""); setVideoUrl(""); router.refresh(); setTimeout(() => setDone(false), 4000); }
      else setError(res.error || "Erreur");
    });
  }

  return (
    <form onSubmit={onSubmit} className="rounded-2xl bg-white dark:bg-white/[0.04] border border-cream-200 dark:border-white/10 p-5 sm:p-6 space-y-5">
      <input type="hidden" name="type" value={type} />
      <div className="flex items-center gap-2 text-gray-900 dark:text-white">
        <Ruler size={20} className="text-violet-600 dark:text-violet-300" />
        <h2 className="font-semibold">{isPlacement ? "Nouvelle demande de placement" : "Nouvelle commande sur mesure"}</h2>
      </div>
      <p className="text-xs text-gray-500 dark:text-white/50 -mt-3">
        {isPlacement
          ? "Décrivez la pièce à placer et joignez le patron ou une photo. Notre équipe vous proposera un prix ; vous l'acceptez avant qu'une patronniste calcule votre placement (calage des pièces sur le tissu)."
          : "Décrivez votre modèle et joignez une photo. Notre équipe vous proposera un prix ; vous l'acceptez avant qu'une patronniste réalise votre patron."}
      </p>

      {error && <div className="rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-red-700 dark:text-red-300 px-4 py-3 text-sm">{error}</div>}
      {done && <div className="rounded-xl bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/30 text-green-700 dark:text-green-300 px-4 py-3 text-sm flex items-center gap-2"><Check size={16} /> Demande envoyée ! Vous recevrez une proposition de prix.</div>}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="sm:col-span-3">
          <label className={label}>{isPlacement ? "Pièce / vêtement à placer *" : "Modèle souhaité *"}</label>
          <input name="titre" required className={field} placeholder={isPlacement ? "Ex. Caftan — placement sur 1,40 m" : "Ex. Robe de soirée fendue"} />
        </div>
        <div>
          <label className={label}>Taille de référence</label>
          <input name="taille" className={field} placeholder="Ex. 40" />
        </div>
        <div className="sm:col-span-2">
          <label className={label}>{isPlacement ? "Tissu & laize (largeur)" : "Tissu souhaité"}</label>
          <input name="tissu" className={field} placeholder={isPlacement ? "Ex. Satin, laize 1,40 m" : "Ex. Satin duchesse bordeaux"} />
        </div>
      </div>

      {/* Photo + vidéo du modèle souhaité */}
      <div>
        <p className={label}>Photo & vidéo du modèle (recommandé)</p>
        <p className="text-xs text-gray-500 dark:text-white/50 mb-2.5">Joignez une photo et/ou une courte vidéo du modèle pour aider le patronniste.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Photo */}
          <div className="rounded-xl border border-cream-200 dark:border-white/15 p-3">
            {photoUrl ? (
              <div className="relative">
                <img src={photoUrl} alt="Modèle" className="w-full h-40 object-cover rounded-lg" />
                <button type="button" onClick={() => setPhotoUrl("")} className="absolute -top-2 -end-2 bg-white border border-cream-200 rounded-full p-1 shadow text-gray-500 hover:text-red-500"><X size={14} /></button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center gap-1.5 h-40 cursor-pointer text-gray-400 hover:text-orange-500 transition-colors">
                {busyMedia === "photo" ? <Loader2 size={24} className="animate-spin" /> : <ImagePlus size={24} />}
                <span className="text-xs font-semibold">{busyMedia === "photo" ? "Envoi…" : "Ajouter une photo"}</span>
                <input type="file" accept="image/*" className="hidden" disabled={busyMedia !== null}
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadMedia(f, "photo"); e.currentTarget.value = ""; }} />
              </label>
            )}
          </div>
          {/* Vidéo → Bunny Stream (TUS, gère les gros fichiers) */}
          <div className="rounded-xl border border-cream-200 dark:border-white/15 p-3">
            <SurMesureVideoUploader value={videoUrl} onChange={setVideoUrl} />
          </div>
        </div>
      </div>

      <div>
        <p className={label}>Table de mesures (en cm)</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {MESURE_FIELDS.map((m) => (
            <div key={m}>
              <label className="block text-xs text-gray-500 dark:text-white/50 mb-1">{m}</label>
              <input name={`m_${m}`} type="number" min="0" step="0.5" className={field} placeholder="cm" />
            </div>
          ))}
        </div>
      </div>

      <div>
        <label className={label}>Note (optionnel)</label>
        <textarea name="note" rows={2} className={field} placeholder="Précisions, délais, inspiration…" />
      </div>

      <button type="submit" disabled={pending} className="inline-flex items-center gap-2 bg-orange-DEFAULT hover:bg-orange-600 disabled:opacity-60 text-white font-semibold px-6 py-3 rounded-xl transition-colors">
        {pending ? <Loader2 size={18} className="animate-spin" /> : <Ruler size={18} />}
        {isPlacement ? "Envoyer ma demande de placement" : "Envoyer ma commande sur mesure"}
      </button>
    </form>
  );
}
