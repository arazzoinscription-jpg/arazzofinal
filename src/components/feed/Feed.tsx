"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createPost } from "@/app/actions/feed";
import { PostCard } from "./PostCard";
import { type FeedPost, type CurrentUser } from "./types";

/**
 * Fil d'actualités complet : zone de publication + liste triée par date décroissante.
 * groupId = null → feed global ; sinon feed du groupe.
 */
export function Feed({ posts, me, groupId = null }: { posts: FeedPost[]; me: CurrentUser; groupId?: string | null }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [content, setContent] = useState("");
  const [previews, setPreviews] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();
  const [err, setErr] = useState("");

  function onFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).slice(0, 4);
    setPreviews(files.map((f) => URL.createObjectURL(f)));
    setErr("");
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const files = Array.from(fileRef.current?.files ?? []);
    if (!content.trim() && files.length === 0) { setErr("Ajoutez du texte ou une image."); return; }
    setErr("");

    const fd = new FormData();
    fd.append("content", content);
    if (groupId) fd.append("groupId", groupId);
    files.slice(0, 4).forEach((f) => fd.append("files", f));

    startTransition(async () => {
      const res = await createPost(fd);
      if (res.ok) {
        setContent("");
        setPreviews([]);
        if (fileRef.current) fileRef.current.value = "";
        router.refresh();
      } else setErr(res.error ?? "Erreur");
    });
  }

  return (
    <div className="space-y-5">
      {/* Composeur */}
      <form onSubmit={submit} className="bg-white rounded-2xl border border-cream-200 shadow-soft p-5">
        <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={3}
          placeholder="Partagez une actualité, une réalisation…"
          className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none" />

        {previews.length > 0 && (
          <div className="grid grid-cols-4 gap-2 mt-3">
            {previews.map((p, i) => (
              <img key={i} src={p} alt="" className="w-full h-20 object-cover rounded-lg border border-cream-200" />
            ))}
          </div>
        )}

        <div className="flex items-center justify-between mt-3">
          <label className="cursor-pointer text-sm text-violet-DEFAULT font-semibold hover:underline">
            📷 Ajouter des images
            <input ref={fileRef} type="file" accept="image/*" multiple onChange={onFiles} className="hidden" />
          </label>
          <button type="submit" disabled={isPending}
            className="bg-orange-DEFAULT text-white px-6 py-2 rounded-xl font-semibold hover:bg-orange-600 transition-colors disabled:opacity-50">
            {isPending ? "Publication…" : "Publier"}
          </button>
        </div>
        {err && <p className="text-sm text-red-500 mt-2">{err}</p>}
        <p className="text-xs text-gray-400 mt-2 font-dm">Les images sont automatiquement supprimées après 48 h.</p>
      </form>

      {/* Liste des publications */}
      {posts.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-cream-200">
          <div className="text-5xl mb-3">📭</div>
          <p className="text-gray-400 font-dm">Aucune publication pour le moment. Soyez la première !</p>
        </div>
      ) : (
        posts.map((p) => <PostCard key={p.id} post={p} me={me} />)
      )}
    </div>
  );
}
