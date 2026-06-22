"use client";

import { useEffect, useState, useTransition } from "react";
import { UserPlus, Check } from "lucide-react";
import { toggleFollow } from "@/app/actions/community";
import { toast } from "@/components/ui/toast";

interface Props {
  userId: string;
  name: string;
  roleLabel: string;
  bio?: string | null;
  username?: string | null;
  avatarUrl?: string | null;
  likes: number;
  posts: number;
  followers: number;
  isMe: boolean;
  isFollowing: boolean;
  lang?: "fr" | "ar" | "en";
}

const FOLLOW_T = {
  fr: { follow: "Suivre l'aventure", following: "Aventure suivie", posts: "Publications", followers: "Abonnés", likes: "J'aime" },
  ar: { follow: "تابع الرحلة", following: "تتابع الرحلة", posts: "المنشورات", followers: "المتابِعون", likes: "إعجاب" },
  en: { follow: "Follow the journey", following: "Following journey", posts: "Posts", followers: "Followers", likes: "Likes" },
} as const;

/** Carte de profil communauté — stats animées + bouton d'abonnement. */
export function CommunityProfileCard({
  userId, name, roleLabel, bio, username, avatarUrl, likes, posts, followers, isMe, isFollowing, lang = "fr",
}: Props) {
  const ft = FOLLOW_T[lang];
  const [aLikes, setALikes] = useState(0);
  const [aPosts, setAPosts] = useState(0);
  const [following, setFollowing] = useState(isFollowing);
  const [followerCount, setFollowerCount] = useState(followers);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const steps = 40;
    let step = 0;
    const id = setInterval(() => {
      step++;
      const f = Math.min(step / steps, 1);
      setALikes(Math.floor(likes * f));
      setAPosts(Math.floor(posts * f));
      if (step >= steps) { setALikes(likes); setAPosts(posts); clearInterval(id); }
    }, 30);
    return () => clearInterval(id);
  }, [likes, posts]);

  function onFollow() {
    setFollowing((f) => !f);
    setFollowerCount((c) => c + (following ? -1 : 1));
    startTransition(async () => {
      const res = await toggleFollow(userId);
      if (res.ok) { setFollowing(res.following); setFollowerCount(res.followers); }
      else { setFollowing(isFollowing); setFollowerCount(followers); toast(res.error ?? "Erreur", "error"); }
    });
  }

  const fmt = (n: number) =>
    n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1_000 ? `${(n / 1_000).toFixed(1)}K` : `${n}`;
  const initial = (name.trim()[0] ?? "?").toUpperCase();

  return (
    <div className="w-full max-w-sm mx-auto">
      <div className="bg-white dark:bg-[#15102b] rounded-[2rem] shadow-xl border border-cream-200 dark:border-white/10 overflow-hidden">
        {/* En-tête dégradé couture */}
        <div className="relative h-32 bg-gradient-to-br from-violet-DEFAULT via-violet-600 to-orange-500">
          <div aria-hidden className="absolute inset-0 opacity-25"
            style={{
              backgroundImage:
                "linear-gradient(to right, rgba(255,255,255,0.18) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.18) 1px, transparent 1px)",
              backgroundSize: "18px 18px",
            }} />
          {!isMe && (
            <button onClick={onFollow} disabled={pending}
              className={`absolute top-4 right-4 inline-flex items-center gap-1.5 rounded-full px-5 py-2 text-sm font-semibold transition-colors disabled:opacity-70 ${
                following ? "bg-white/20 text-white border border-white/40 backdrop-blur" : "bg-white text-violet-800 hover:bg-white/90"}`}>
              {following ? <><Check size={15} /> {ft.following}</> : <><UserPlus size={15} /> {ft.follow}</>}
            </button>
          )}
        </div>

        <div className="px-6 pb-6 -mt-12">
          {/* Avatar */}
          <div className="w-24 h-24 mb-4 rounded-full border-4 border-white dark:border-[#15102b] overflow-hidden bg-orange-DEFAULT grid place-items-center text-white text-3xl font-bold shadow-lg">
            {avatarUrl ? <img src={avatarUrl} alt={name} className="w-full h-full object-cover" /> : initial}
          </div>

          {/* Nom + rôle + bio */}
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight font-playfair">{name}</h2>
          {username && <p className="text-sm text-gray-400 dark:text-white/40 font-dm">@{username}</p>}
          <p className="text-orange-600 dark:text-orange-300 text-sm font-semibold mt-1 font-dm">{roleLabel}</p>
          {bio && <p className="text-gray-500 dark:text-white/60 text-sm leading-relaxed mt-3 font-dm">{bio}</p>}

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2 mt-6 py-4 border-t border-b border-cream-200 dark:border-white/10">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{aPosts}</div>
              <div className="text-xs text-gray-400 dark:text-white/50 font-dm mt-0.5">{ft.posts}</div>
            </div>
            <div className="text-center border-l border-r border-cream-200 dark:border-white/10">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{fmt(followerCount)}</div>
              <div className="text-xs text-gray-400 dark:text-white/50 font-dm mt-0.5">{ft.followers}</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{fmt(aLikes)}</div>
              <div className="text-xs text-gray-400 dark:text-white/50 font-dm mt-0.5">{ft.likes}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
