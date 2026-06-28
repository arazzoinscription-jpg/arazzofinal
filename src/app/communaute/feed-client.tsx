"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Heart, MessageCircle, Volume2, VolumeX, ArrowRight, ArrowLeft, LayoutGrid, Scissors, X, Send } from "lucide-react";
import { toggleLike, addComment } from "@/app/actions/feed";
import { getPostComments } from "@/app/actions/community";
import { sourceLabel, type CommunityItem } from "@/lib/community-types";
import { CommunityTabs } from "./community-tabs";

interface Comment {
  id: string; content: string; created_at: string; author_id: string;
  author: { id: string; nom: string; avatar_url: string | null; role: string };
}

export function FeedClient({ items, meId, bunnyLibraryId }: { items: CommunityItem[]; meId: string; bunnyLibraryId: string }) {
  const router = useRouter();
  const [activeId, setActiveId] = useState<string | null>(items[0]?.id ?? null);
  const [muted, setMuted] = useState(true);
  const [commentPost, setCommentPost] = useState<string | null>(null);

  const shown = items;

  // Barre du haut : Retour · logo→site · dashboard · son + onglets bascule.
  const topBar = (
    <div className="fixed top-0 inset-x-0 z-30 pt-[max(10px,env(safe-area-inset-top))] pb-2 bg-[#0b0818]/90 backdrop-blur-md border-b border-white/10">
      <div className="flex items-center gap-2 px-3">
        <button onClick={() => router.back()} aria-label="Retour"
          className="w-9 h-9 grid place-items-center rounded-full bg-black/40 text-white backdrop-blur shrink-0"><ArrowLeft size={18} /></button>
        <Link href="/" className="font-playfair text-white font-bold text-base drop-shadow shrink-0">Arazzo</Link>
        <div className="flex-1" />
        <Link href="/dashboard" aria-label="Tableau de bord"
          className="w-9 h-9 grid place-items-center rounded-full bg-black/40 text-white backdrop-blur shrink-0"><LayoutGrid size={17} /></Link>
        <button onClick={() => setMuted((m) => !m)} aria-label="Son"
          className="w-9 h-9 grid place-items-center rounded-full bg-black/40 text-white backdrop-blur shrink-0">
          {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </button>
      </div>
      {/* Menu UNIQUE de la communauté (Pour toi · Actualité · Groups · Offre) */}
      <div className="mt-1.5"><CommunityTabs /></div>
    </div>
  );

  if (items.length === 0) {
    return (
      <div className="fixed inset-0 bg-[#0b0818] text-white flex flex-col items-center justify-center gap-4 px-8 text-center">
        <Scissors className="text-orange-400" size={44} />
        <h1 className="font-playfair text-2xl font-bold">La communauté est encore vide</h1>
        <p className="text-white/60 font-dm max-w-sm">Sois la première à publier : partage un de tes travaux pratiques depuis tes cours, ou reviens bientôt découvrir les créations des autres.</p>
        <Link href="/dashboard" className="mt-2 bg-orange-DEFAULT text-white px-6 py-3 rounded-xl font-semibold">Retour au tableau de bord</Link>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black overflow-y-scroll snap-y snap-mandatory" style={{ scrollbarWidth: "none" }}>
      {topBar}

      {shown.length === 0 ? (
        <div className="h-[100dvh] flex items-center justify-center text-white/60 px-8 text-center font-dm">
          Aucune vidéo dans cette catégorie pour l'instant.
        </div>
      ) : shown.map((it) => (
        <Slide
          key={it.id}
          item={it}
          active={activeId === it.id}
          muted={muted}
          bunnyLibraryId={bunnyLibraryId}
          onActive={() => setActiveId(it.id)}
          onOpenComments={() => setCommentPost(it.postId)}
        />
      ))}

      {commentPost && (
        <CommentSheet postId={commentPost} onClose={() => setCommentPost(null)} />
      )}
    </div>
  );
}

function Slide({
  item, active, muted, bunnyLibraryId, onActive, onOpenComments,
}: {
  item: CommunityItem; active: boolean; muted: boolean; bunnyLibraryId: string;
  onActive: () => void; onOpenComments: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [liked, setLiked] = useState(item.liked);
  const [likeCount, setLikeCount] = useState(item.likeCount);
  const [, startTransition] = useTransition();

  // Détecte quand la slide est majoritairement visible → devient active.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting && e.intersectionRatio > 0.6) onActive(); },
      { threshold: [0, 0.6, 1] }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [onActive]);

  // Lecture/pause de la vidéo native selon l'état actif.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (active) { v.play().catch(() => {}); } else { v.pause(); v.currentTime = 0; }
  }, [active]);

  function onLike() {
    setLiked((l) => !l);
    setLikeCount((c) => c + (liked ? -1 : 1));
    startTransition(async () => {
      const res = await toggleLike(item.postId);
      if (res.ok) { setLiked(res.liked ?? false); setLikeCount(res.count ?? 0); }
    });
  }

  const isBunny = !item.mediaUrl && !!item.videoHls;

  return (
    <section ref={ref} className="relative h-[100dvh] w-full snap-start snap-always flex items-center justify-center overflow-hidden bg-black">
      {/* Média */}
      {item.mediaKind === "image" ? (
        <img src={item.mediaUrl ?? item.thumbnail ?? ""} alt="" className="absolute inset-0 w-full h-full object-contain" />
      ) : isBunny ? (
        active ? (
          <iframe
            src={`https://iframe.mediadelivery.net/embed/${bunnyLibraryId}/${getBunnyId(item.videoHls)}?autoplay=true&loop=true&muted=${muted}&preload=true&responsive=true`}
            allow="autoplay; encrypted-media; picture-in-picture"
            className="absolute inset-0 w-full h-full" style={{ border: 0 }} loading="lazy"
          />
        ) : (
          item.thumbnail && <img src={item.thumbnail} alt="" className="absolute inset-0 w-full h-full object-contain" />
        )
      ) : (
        <video
          ref={videoRef}
          src={item.mediaUrl ?? ""}
          poster={item.thumbnail ?? undefined}
          muted={muted} loop playsInline preload="metadata"
          className="absolute inset-0 w-full h-full object-contain"
        />
      )}

      {/* Dégradé bas pour lisibilité */}
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 to-transparent pointer-events-none" />

      {/* Actions latérales */}
      <div className="absolute right-3 bottom-28 z-20 flex flex-col items-center gap-5 text-white">
        <button onClick={onLike} className="flex flex-col items-center gap-1">
          <span className={`w-12 h-12 grid place-items-center rounded-full bg-black/30 backdrop-blur ${liked ? "text-orange-500" : "text-white"}`}>
            <Heart size={26} fill={liked ? "currentColor" : "none"} />
          </span>
          <span className="text-xs font-semibold">{likeCount}</span>
        </button>
        <button onClick={onOpenComments} className="flex flex-col items-center gap-1">
          <span className="w-12 h-12 grid place-items-center rounded-full bg-black/30 backdrop-blur">
            <MessageCircle size={26} />
          </span>
          <span className="text-xs font-semibold">{item.commentCount}</span>
        </button>
      </div>

      {/* Infos auteur + légende + CTA */}
      <div className="absolute left-4 right-20 bottom-24 z-20 text-white">
        <span className="inline-block text-[11px] font-bold uppercase tracking-wide bg-white/15 backdrop-blur px-2 py-0.5 rounded-full mb-2">
          {sourceLabel(item.sourceType)}
        </span>
        <Link href={`/communaute/u/${item.author.id}`} className="flex items-center gap-2 mb-2">
          <span className="w-9 h-9 rounded-full bg-orange-DEFAULT grid place-items-center overflow-hidden font-bold text-sm">
            {item.author.avatar_url
              ? <img src={item.author.avatar_url} alt="" className="w-full h-full object-cover" />
              : (item.author.nom[0] ?? "?").toUpperCase()}
          </span>
          <span className="font-semibold drop-shadow">{item.author.nom}</span>
        </Link>
        {item.caption && <p className="text-sm text-white/90 font-dm line-clamp-2 drop-shadow mb-3">{item.caption}</p>}
        {item.cta && (
          <Link href={item.cta.href}
            className="inline-flex items-center gap-1.5 bg-orange-DEFAULT text-white px-4 py-2.5 rounded-xl font-semibold text-sm shadow-lg">
            {item.cta.label} <ArrowRight size={16} />
          </Link>
        )}
      </div>
    </section>
  );
}

/** Extrait le GUID Bunny depuis l'URL HLS `{pullzone}/{guid}/playlist.m3u8`. */
function getBunnyId(hls: string | null): string {
  if (!hls) return "";
  const parts = hls.split("/").filter(Boolean);
  return parts[parts.length - 2] ?? "";
}

function CommentSheet({ postId, onClose }: { postId: string; onClose: () => void }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let alive = true;
    getPostComments(postId).then((res) => {
      if (alive && res.ok) setComments(res.comments as Comment[]);
      if (alive) setLoading(false);
    });
    return () => { alive = false; };
  }, [postId]);

  function send() {
    const t = text.trim();
    if (!t) return;
    setText("");
    startTransition(async () => {
      const res = await addComment(postId, t);
      if (res.ok && res.comment) setComments((c) => [...c, res.comment as unknown as Comment]);
    });
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50" />
      <div onClick={(e) => e.stopPropagation()}
        className="relative w-full max-h-[70vh] bg-white rounded-t-3xl flex flex-col">
        <div className="flex items-center justify-between px-5 py-3 border-b border-cream-200">
          <span className="font-semibold text-gray-900">{comments.length} commentaire(s)</span>
          <button onClick={onClose} className="w-8 h-8 grid place-items-center rounded-full hover:bg-cream-100"><X size={18} /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-3">
          {loading ? (
            <p className="text-sm text-gray-400 text-center py-6">Chargement…</p>
          ) : comments.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">Sois la première à commenter ✨</p>
          ) : comments.map((c) => (
            <div key={c.id} className="flex gap-2.5">
              <span className="w-8 h-8 rounded-full bg-orange-DEFAULT grid place-items-center overflow-hidden text-white text-xs font-bold shrink-0">
                {c.author.avatar_url ? <img src={c.author.avatar_url} alt="" className="w-full h-full object-cover" /> : (c.author.nom[0] ?? "?").toUpperCase()}
              </span>
              <div>
                <p className="text-sm"><span className="font-semibold text-gray-900">{c.author.nom}</span></p>
                <p className="text-sm text-gray-700 font-dm">{c.content}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 p-3 border-t border-cream-200 pb-[max(12px,env(safe-area-inset-bottom))]">
          <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="Ajoute un commentaire…"
            className="flex-1 border border-gray-200 rounded-full px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
          <button onClick={send} disabled={isPending || !text.trim()}
            className="w-10 h-10 grid place-items-center rounded-full bg-orange-DEFAULT text-white disabled:opacity-50"><Send size={18} /></button>
        </div>
      </div>
    </div>
  );
}
