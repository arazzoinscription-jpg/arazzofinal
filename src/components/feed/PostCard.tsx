"use client";

import { useState, useTransition } from "react";
import { toggleLike, addComment, deleteComment, deletePost, togglePostPublished } from "@/app/actions/feed";
import { type FeedPost, type CurrentUser, type FeedComment, roleLabel } from "./types";

function Avatar({ nom, url }: { nom: string; url: string | null }) {
  if (url) return <img src={url} alt="" className="w-10 h-10 rounded-full object-cover flex-shrink-0" />;
  const initial = (nom?.[0] ?? "?").toUpperCase();
  return (
    <div className="w-10 h-10 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-semibold flex-shrink-0">
      {initial}
    </div>
  );
}

function timeAgo(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

/** Carte d'une publication : auteur, contenu, image(s), likes et commentaires. */
export function PostCard({ post, me }: { post: FeedPost; me: CurrentUser }) {
  const [liked, setLiked] = useState(post.liked);
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [comments, setComments] = useState<FeedComment[]>(post.comments);
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [deleted, setDeleted] = useState(false);
  const [published, setPublished] = useState(post.published ?? true);
  const [isLiking, startLike] = useTransition();
  const [isCommenting, startComment] = useTransition();
  const [isPublishing, startPublish] = useTransition();
  const [err, setErr] = useState("");

  const isAdmin = me.role === "admin";

  function onTogglePublish() {
    const next = !published;
    setPublished(next);
    startPublish(async () => {
      try {
        const res = await togglePostPublished(post.id, next);
        if (!res?.ok) { setPublished(!next); setErr(res?.error ?? "Erreur"); }
      } catch (e) {
        setPublished(!next);
        setErr(e instanceof Error ? e.message : "Erreur");
      }
    });
  }

  if (deleted) return null;

  function onLike() {
    // Optimiste
    setLiked((v) => !v);
    setLikeCount((c) => c + (liked ? -1 : 1));
    startLike(async () => {
      const res = await toggleLike(post.id);
      if (res.ok && typeof res.count === "number") {
        setLiked(res.liked);
        setLikeCount(res.count);
      }
    });
  }

  function onAddComment(e: React.FormEvent) {
    e.preventDefault();
    const text = newComment.trim();
    if (!text) return;
    setErr("");
    startComment(async () => {
      const res = await addComment(post.id, text);
      if (res.ok && res.comment) {
        setComments((c) => [...c, res.comment as unknown as FeedComment]);
        setNewComment("");
      } else setErr(res.error ?? "Erreur");
    });
  }

  function onDeleteComment(id: string) {
    startComment(async () => {
      const res = await deleteComment(id);
      if (res.ok) setComments((c) => c.filter((x) => x.id !== id));
    });
  }

  function onDeletePost() {
    if (!confirm("Supprimer cette publication ?")) return;
    startComment(async () => {
      const res = await deletePost(post.id);
      if (res.ok) setDeleted(true);
    });
  }

  const canDeletePost = post.author_id === me.id || isAdmin;

  return (
    <article className={`bg-white rounded-2xl border shadow-soft p-5 ${published ? "border-cream-200" : "border-dashed border-orange-300 bg-orange-50/40"}`}>
      {/* En-tête */}
      <header className="flex items-center gap-3 mb-3">
        <Avatar nom={post.author.nom} url={post.author.avatar_url} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-gray-900 font-dm truncate">{post.author.nom}</span>
            <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${
              post.author.role === "formateur" ? "bg-orange-100 text-orange-600"
                : post.author.role === "admin" ? "bg-orange-100 text-orange-700"
                : "bg-gray-100 text-gray-500"
            }`}>{roleLabel(post.author.role)}</span>
            {!published && (
              <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold bg-orange-200 text-orange-800">Brouillon</span>
            )}
          </div>
          <p className="text-xs text-gray-400 font-dm">{timeAgo(post.created_at)}</p>
        </div>
        {isAdmin && (
          <button
            onClick={onTogglePublish}
            disabled={isPublishing}
            className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 ${
              published
                ? "bg-gray-100 text-gray-600 hover:bg-gray-200"
                : "bg-green-600 text-white hover:bg-green-700"
            }`}
          >
            {published ? "Masquer" : "✓ Publier"}
          </button>
        )}
        {canDeletePost && (
          <button onClick={onDeletePost} className="text-gray-300 hover:text-red-500 text-sm">✕</button>
        )}
      </header>

      {/* Contenu */}
      {post.content && <p className="text-gray-800 font-dm whitespace-pre-wrap mb-3">{post.content}</p>}

      {/* Images (placeholder si expirées après 48h) */}
      {post.images.length > 0 && (
        <div className={`grid gap-2 mb-3 ${post.images.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
          {post.images.map((img, i) =>
            img.expired || !img.image_url ? (
              <div key={i} className="flex flex-col items-center justify-center bg-cream-100 rounded-xl border border-cream-200 text-gray-400 h-48">
                <span className="text-3xl mb-1">🖼️</span>
                <span className="text-sm font-dm">Image expirée</span>
              </div>
            ) : (
              <a key={i} href={img.image_url} target="_blank" rel="noreferrer">
                <img src={img.image_url} alt="" className="w-full max-h-96 object-cover rounded-xl border border-cream-200" />
              </a>
            )
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-4 border-t border-cream-100 pt-3">
        <button onClick={onLike} disabled={isLiking}
          className={`flex items-center gap-1.5 text-sm font-semibold transition-colors ${liked ? "text-red-500" : "text-gray-500 hover:text-red-500"}`}>
          <span>{liked ? "❤️" : "🤍"}</span> {likeCount}
        </button>
        <button onClick={() => setShowComments((v) => !v)}
          className="flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-orange-600 transition-colors">
          💬 {comments.length}
        </button>
      </div>

      {/* Commentaires */}
      {showComments && (
        <div className="mt-3 space-y-3">
          {comments.map((c) => (
            <div key={c.id} className="flex items-start gap-2">
              <Avatar nom={c.author.nom} url={c.author.avatar_url} />
              <div className="flex-1 min-w-0 bg-cream-50 rounded-xl px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-gray-800 font-dm">{c.author.nom}</span>
                  {(c.author_id === me.id || isAdmin) && (
                    <button onClick={() => onDeleteComment(c.id)} className="text-xs text-gray-300 hover:text-red-500">Supprimer</button>
                  )}
                </div>
                <p className="text-sm text-gray-700 font-dm whitespace-pre-wrap">{c.content}</p>
              </div>
            </div>
          ))}

          <form onSubmit={onAddComment} className="flex items-center gap-2">
            <input value={newComment} onChange={(e) => setNewComment(e.target.value)}
              placeholder="Écrire un commentaire…"
              className="flex-1 border border-gray-200 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
            <button type="submit" disabled={isCommenting || !newComment.trim()}
              className="bg-orange-DEFAULT text-white px-4 py-2 rounded-full text-sm font-semibold hover:bg-orange-600 transition-colors disabled:opacity-50">
              Envoyer
            </button>
          </form>
          {err && <p className="text-xs text-red-500">{err}</p>}
        </div>
      )}
    </article>
  );
}
