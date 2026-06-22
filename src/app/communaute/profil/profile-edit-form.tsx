"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Camera, Loader2 } from "lucide-react";
import { updateCommunityProfile } from "@/app/actions/profile";
import { toast } from "@/components/ui/toast";

interface Initial { nom: string; username: string; bio: string; avatar_url: string; }

export function ProfileEditForm({ userId, initial }: { userId: string; initial: Initial }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(initial.avatar_url || null);
  const [username, setUsername] = useState(initial.username);
  const [bio, setBio] = useState(initial.bio);
  const [isPending, startTransition] = useTransition();

  const initial0 = (initial.nom.trim()[0] ?? "?").toUpperCase();

  function pick(f: File | null) {
    if (!f) return;
    if (!f.type.startsWith("image/")) { toast("Choisissez une image", "error"); return; }
    if (f.size > 3 * 1024 * 1024) { toast("Image trop lourde (max 3 Mo)", "error"); return; }
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  function save() {
    startTransition(async () => {
      const fd = new FormData();
      fd.append("username", username);
      fd.append("bio", bio);
      if (file) fd.append("avatar", file);
      const res = await updateCommunityProfile(fd);
      if (res.ok) {
        toast("Profil mis à jour ✓", "success");
        router.push(`/communaute/u/${userId}`);
        router.refresh();
      } else {
        toast(res.error ?? "Erreur", "error");
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Avatar */}
      <div className="flex items-center gap-4">
        <button onClick={() => fileRef.current?.click()}
          className="relative w-24 h-24 rounded-full overflow-hidden bg-orange-DEFAULT grid place-items-center text-white text-3xl font-bold border-4 border-white/10 group">
          {preview ? <img src={preview} alt="" className="w-full h-full object-cover" /> : initial0}
          <span className="absolute inset-0 bg-black/45 grid place-items-center opacity-0 group-hover:opacity-100 transition-opacity">
            <Camera size={22} />
          </span>
        </button>
        <div>
          <button onClick={() => fileRef.current?.click()}
            className="text-sm font-semibold text-orange-300 hover:underline">Changer la photo</button>
          <p className="text-xs text-white/40 mt-1 font-dm">JPG / PNG · max 3 Mo</p>
        </div>
        <input ref={fileRef} type="file" accept="image/*" className="hidden"
          onChange={(e) => pick(e.target.files?.[0] ?? null)} />
      </div>

      {/* Username */}
      <div>
        <label className="block text-sm font-medium text-white/80 mb-1.5">Nom d'utilisateur</label>
        <div className="flex items-center rounded-xl border border-white/15 bg-white/5 focus-within:ring-2 focus-within:ring-orange-500 overflow-hidden">
          <span className="pl-3 pr-1 text-white/40">@</span>
          <input value={username} onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ""))}
            maxLength={20} placeholder="ton_pseudo"
            className="flex-1 bg-transparent py-2.5 pr-3 text-white placeholder-white/30 focus:outline-none" />
        </div>
        <p className="text-xs text-white/40 mt-1 font-dm">3 à 20 caractères : lettres, chiffres, _</p>
      </div>

      {/* Bio */}
      <div>
        <label className="block text-sm font-medium text-white/80 mb-1.5">Bio</label>
        <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} maxLength={200}
          placeholder="Présente-toi en quelques mots…"
          className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none" />
        <p className="text-xs text-white/40 mt-1 font-dm text-right">{bio.length}/200</p>
      </div>

      <button onClick={save} disabled={isPending}
        className="w-full inline-flex items-center justify-center gap-2 bg-orange-DEFAULT text-white py-3 rounded-xl font-semibold hover:bg-orange-600 transition-colors disabled:opacity-60">
        {isPending ? <><Loader2 size={16} className="animate-spin" /> Enregistrement…</> : "Enregistrer"}
      </button>
    </div>
  );
}
