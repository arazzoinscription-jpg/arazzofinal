"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Video, Loader2, Send, Share2, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { recordPractical } from "./extras-actions";
import { sharePracticalToFeed } from "@/app/actions/community";
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
  const [photo, setPhoto] = useState<File | null>(null);
  const [video, setVideo] = useState<File | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [sharingId, setSharingId] = useState<string | null>(null);
  const [shared, setShared] = useState<Set<string>>(new Set());

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
    const path = `${lessonId}/${meId}/${type}-${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("practicals").upload(path, file, { upsert: false, contentType: file.type || undefined });
    if (error) throw new Error("Envoi échoué : " + error.message);
    return supabase.storage.from("practicals").getPublicUrl(path).data.publicUrl;
  }

  async function submit() {
    setErr(null);
    if (!photo && !video && !note.trim()) { setErr("Ajoutez une photo, une vidéo ou une note."); return; }
    setBusy(true);
    try {
      const photoUrl = photo ? await upload(photo, "photo") : null;
      const videoUrl = video ? await upload(video, "video") : null;
      const res = await recordPractical(lessonId, photoUrl, videoUrl, note);
      if (!res.ok) throw new Error(res.error || "Erreur");
      setPhoto(null); setVideo(null); setNote("");
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
        {isStaff ? "Soumettez un exemple, et retrouvez les travaux de vos élèves ci-dessous." : "Envoyez une photo et/ou une vidéo de votre réalisation."}
      </p>

      {/* Formulaire d'envoi (visible pour tous) */}
      {(
        <div className="rounded-xl border border-cream-200 dark:border-white/10 p-4 mb-5 space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="text-sm">
              <span className="flex items-center gap-1.5 text-gray-600 dark:text-white/70 mb-1"><ImagePlus size={15} /> Photo</span>
              <input type="file" accept="image/*" onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
                className="block w-full text-xs text-gray-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-cream-100 file:text-gray-700" />
            </label>
            <label className="text-sm">
              <span className="flex items-center gap-1.5 text-gray-600 dark:text-white/70 mb-1"><Video size={15} /> Vidéo</span>
              <input type="file" accept="video/*" onChange={(e) => setVideo(e.target.files?.[0] ?? null)}
                className="block w-full text-xs text-gray-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-cream-100 file:text-gray-700" />
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

              {/* L'élève peut partager SON travail sur le feed communauté (encouragements). */}
              {s.user_id === meId && (s.photo_url || s.video_url) && (
                <button
                  onClick={() => share(s.id)}
                  disabled={sharingId === s.id || shared.has(s.id)}
                  className="mt-3 inline-flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-xl border-2 border-orange-DEFAULT text-orange-600 hover:bg-orange-50 disabled:opacity-60 transition-colors">
                  {sharingId === s.id ? <Loader2 size={15} className="animate-spin" />
                    : shared.has(s.id) ? <Check size={15} />
                    : <Share2 size={15} />}
                  {shared.has(s.id) ? "Publié sur la communauté" : "Postez vos travaux sur la communauté"}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
