"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Video, Loader2, Send, Share2, Check, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { recordPractical, deletePractical } from "./extras-actions";
import { sharePracticalToFeed } from "@/app/actions/community";
import { MAX_PRACTICAL_PHOTOS, MAX_PRACTICAL_VIDEOS } from "@/lib/practicals-limits";
import { toast } from "@/components/ui/toast";

export interface Practical {
  id: string;
  user_id: string;
  photo_url: string | null;
  video_url: string | null;
  note: string | null;
  feedback: string | null;
  status: string;
  created_at: string;
  authorName: string;
}

const STATUS_BADGE: Record<string, string> = {
  submitted: "bg-orange-50 text-orange-700",
  reviewed: "bg-violet-50 text-violet-700",
  approved: "bg-green-50 text-green-700",
};
const STATUS_LABEL: Record<string, string> = { submitted: "Soumis", reviewed: "Corrigé", approved: "Validé ✓" };

export function LessonPractical({ lessonId, meId, isStaff, submissions }: { lessonId: string; meId: string; isStaff: boolean; submissions: Practical[] }) {
  const router = useRouter();
  const supabase = createClient();
  const [photos, setPhotos] = useState<File[]>([]);
  const [video, setVideo] = useState<File | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [sharingId, setSharingId] = useState<string | null>(null);
  const [shared, setShared] = useState<Set<string>>(new Set());
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function remove(id: string) {
    if (!confirm("Supprimer définitivement ce travail pratique ?")) return;
    setDeletingId(id);
    const res = await deletePractical(id);
    setDeletingId(null);
    if (res.ok) { toast("Travail supprimé ✅", "success"); router.refresh(); }
    else toast(res.error ?? "Suppression impossible", "error");
  }

  // Quota par leçon pour l'élève (le staff n'est pas limité) : 3 photos / 2 vidéos.
  const myPhotos = submissions.filter((s) => s.user_id === meId && s.photo_url).length;
  const myVideos = submissions.filter((s) => s.user_id === meId && s.video_url).length;
  const photoFull = !isStaff && myPhotos >= MAX_PRACTICAL_PHOTOS;
  const videoFull = !isStaff && myVideos >= MAX_PRACTICAL_VIDEOS;
  const remainingPhotos = isStaff ? Infinity : Math.max(0, MAX_PRACTICAL_PHOTOS - myPhotos);

  /** Sélection multiple d'images : bloc DUR à 3 au total — au-delà, rien ne passe. */
  function onPickPhotos(e: React.ChangeEvent<HTMLInputElement>) {
    const list = Array.from(e.target.files ?? []);
    if (list.length === 0) { setPhotos([]); return; }
    if (!isStaff && myPhotos + list.length > MAX_PRACTICAL_PHOTOS) {
      setErr(`⛔ Limite : ${MAX_PRACTICAL_PHOTOS} images maximum par leçon. Vous en avez déjà ${myPhotos} — vous ne pouvez en ajouter que ${remainingPhotos}. Sélection annulée.`);
      setPhotos([]);
      e.target.value = ""; // annule le transfert (aucun fichier retenu)
      return;
    }
    setErr(null);
    setPhotos(list);
  }

  /** Vidéo : bloc DUR à 2 au total. */
  function onPickVideo(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    if (f && videoFull) {
      setErr(`⛔ Limite : ${MAX_PRACTICAL_VIDEOS} vidéos maximum par leçon.`);
      setVideo(null);
      e.target.value = "";
      return;
    }
    setErr(null);
    setVideo(f);
  }

  async function share(id: string) {
    setSharingId(id);
    const res = await sharePracticalToFeed(id);
    setSharingId(null);
    if (res.ok) {
      setShared((s) => new Set(s).add(id));
      toast("Publié sur la communauté ! 🎉", "success");
    } else if (res.error?.includes("déjà")) {
      setShared((s) => new Set(s).add(id));
      toast(res.error, "info");
    } else {
      toast(res.error ?? "Partage impossible", "error");
    }
  }

  // Upload DIRECT vers Supabase Storage (bucket public `practicals`) côté navigateur.
  // Évite la limite ~4,5 Mo des Server Actions sur Vercel → gère photos ET vidéos.
  async function upload(file: File, type: "photo" | "video"): Promise<string> {
    const ext = (file.name.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5) || "bin";
    const uid = crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const path = `${lessonId}/${meId}/${type}-${uid}.${ext}`;
    const { error } = await supabase.storage.from("practicals").upload(path, file, { upsert: false, contentType: file.type || undefined });
    if (error) throw new Error("Envoi échoué : " + error.message);
    return supabase.storage.from("practicals").getPublicUrl(path).data.publicUrl;
  }

  async function submit() {
    setErr(null);
    // Garde DURE avant tout transfert : jamais plus de 3 images / 2 vidéos.
    if (!isStaff) {
      if (myPhotos + photos.length > MAX_PRACTICAL_PHOTOS) {
        setErr(`⛔ ${MAX_PRACTICAL_PHOTOS} images maximum par leçon. Retirez-en ${myPhotos + photos.length - MAX_PRACTICAL_PHOTOS}.`);
        return;
      }
      if (video && videoFull) { setErr(`⛔ ${MAX_PRACTICAL_VIDEOS} vidéos maximum par leçon.`); return; }
    }
    const usePhotos = photos;
    const useVideo = videoFull ? null : video;
    if (usePhotos.length === 0 && !useVideo && !note.trim()) { setErr("Ajoutez une photo, une vidéo ou une note."); return; }
    setBusy(true);
    try {
      const photoUrls: string[] = [];
      for (const f of usePhotos) photoUrls.push(await upload(f, "photo"));
      const videoUrl = useVideo ? await upload(useVideo, "video") : null;

      if (photoUrls.length > 0) {
        // Une ligne par image (la note est jointe à la 1re).
        for (let i = 0; i < photoUrls.length; i++) {
          const res = await recordPractical(lessonId, photoUrls[i], null, i === 0 ? note : null);
          if (!res.ok) throw new Error(res.error || "Erreur");
        }
        if (videoUrl) {
          const res = await recordPractical(lessonId, null, videoUrl, null);
          if (!res.ok) throw new Error(res.error || "Erreur");
        }
      } else {
        const res = await recordPractical(lessonId, null, videoUrl, note);
        if (!res.ok) throw new Error(res.error || "Erreur");
      }

      setPhotos([]); setVideo(null); setNote("");
      router.refresh();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-6 bg-white dark:bg-white/[0.04] rounded-2xl border border-cream-200 dark:border-white/10 p-5">
      <h2 className="font-playfair text-xl font-bold text-gray-900 dark:text-white mb-1">🪡 Travaux pratiques</h2>
      <p className="text-sm text-gray-500 dark:text-white/50 mb-4">
        {isStaff ? "Soumettez un exemple, et retrouvez les travaux de vos élèves ci-dessous." : `Envoyez jusqu'à ${MAX_PRACTICAL_PHOTOS} photos et/ou une vidéo de votre réalisation.`}
      </p>

      {/* Formulaire d'envoi (visible pour tous) */}
      {(
        <div className="rounded-xl border border-cream-200 dark:border-white/10 p-4 mb-5 space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="text-sm">
              <span className="flex items-center justify-between gap-1.5 text-gray-600 dark:text-white/70 mb-1">
                <span className="flex items-center gap-1.5"><ImagePlus size={15} /> Photos <span className="text-[11px] text-gray-400">(max {MAX_PRACTICAL_PHOTOS})</span></span>
                {!isStaff && <span className="text-[11px] text-gray-400">{myPhotos}/{MAX_PRACTICAL_PHOTOS}</span>}
              </span>
              <input type="file" accept="image/*" multiple disabled={photoFull} onChange={onPickPhotos}
                className="block w-full text-xs text-gray-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-cream-100 file:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed" />
              {photoFull ? (
                <span className="block text-[11px] text-orange-600 mt-1">Limite de {MAX_PRACTICAL_PHOTOS} images atteinte — vous ne pouvez plus en ajouter.</span>
              ) : photos.length > 0 ? (
                <span className="block text-[11px] text-gray-500 mt-1">{photos.length} image(s) sélectionnée(s).</span>
              ) : null}
            </label>
            <label className="text-sm">
              <span className="flex items-center justify-between gap-1.5 text-gray-600 dark:text-white/70 mb-1">
                <span className="flex items-center gap-1.5"><Video size={15} /> Vidéo</span>
                {!isStaff && <span className="text-[11px] text-gray-400">{myVideos}/{MAX_PRACTICAL_VIDEOS}</span>}
              </span>
              <input type="file" accept="video/*" disabled={videoFull} onChange={onPickVideo}
                className="block w-full text-xs text-gray-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-cream-100 file:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed" />
              {videoFull && <span className="block text-[11px] text-orange-600 mt-1">Limite de {MAX_PRACTICAL_VIDEOS} vidéos atteinte.</span>}
            </label>
          </div>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Une note (optionnel)…"
            className="w-full border border-cream-200 dark:border-white/15 bg-white dark:bg-white/5 rounded-xl px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500" />
          {err && <p className="text-xs text-red-500">{err}</p>}
          <button onClick={submit} disabled={busy}
            className="inline-flex items-center gap-2 bg-orange-DEFAULT text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-orange-600 disabled:opacity-60">
            {busy ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} Envoyer mon travail
          </button>
        </div>
      )}

      {/* Liste des soumissions */}
      {submissions.length === 0 ? (
        <p className="text-sm text-gray-400 font-dm">{isStaff ? "Aucun travail soumis." : "Vous n'avez pas encore soumis de travail."}</p>
      ) : (
        <div className="space-y-4">
          {submissions.map((s) => (
            <div key={s.id} className="rounded-xl border border-cream-200 dark:border-white/10 p-4">
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-sm font-semibold text-gray-900 dark:text-white">{isStaff ? s.authorName : "Mon travail"}</span>
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${STATUS_BADGE[s.status] ?? ""}`}>{STATUS_LABEL[s.status] ?? s.status}</span>
              </div>
              {s.note && <p className="text-sm text-gray-600 dark:text-white/70 mb-2">{s.note}</p>}
              <div className="flex flex-wrap gap-3 mb-2">
                {s.photo_url && <a href={s.photo_url} target="_blank" rel="noreferrer"><img src={s.photo_url} alt="" className="w-28 h-28 object-cover rounded-lg border border-cream-200" /></a>}
                {s.video_url && <video src={s.video_url} controls className="w-48 rounded-lg border border-cream-200" />}
              </div>
              {s.feedback && (
                <div className="mt-2 rounded-lg bg-violet-50 dark:bg-violet-500/10 border border-violet-100 dark:border-violet-500/20 p-2.5 text-sm text-violet-800 dark:text-violet-200">
                  <span className="font-semibold">Retour formatrice :</span> {s.feedback}
                </div>
              )}

              <div className="mt-3 flex flex-wrap items-center gap-2">
                {/* L'élève peut partager SON travail sur le feed communauté (encouragements). */}
                {s.user_id === meId && (s.photo_url || s.video_url) && (
                  <button
                    onClick={() => share(s.id)}
                    disabled={sharingId === s.id || shared.has(s.id)}
                    className="inline-flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-xl border-2 border-orange-DEFAULT text-orange-600 hover:bg-orange-50 disabled:opacity-60 transition-colors">
                    {sharingId === s.id ? <Loader2 size={15} className="animate-spin" />
                      : shared.has(s.id) ? <Check size={15} />
                      : <Share2 size={15} />}
                    {shared.has(s.id) ? "Publié sur la communauté" : "Postez vos travaux sur la communauté"}
                  </button>
                )}

                {/* Suppression : par l'auteur (son travail) ou le staff (formateur/admin). */}
                {(s.user_id === meId || isStaff) && (
                  <button
                    onClick={() => remove(s.id)}
                    disabled={deletingId === s.id}
                    className="inline-flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-60 transition-colors">
                    {deletingId === s.id ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                    Supprimer
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
