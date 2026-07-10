"use client";

import { useEffect, useState, useTransition } from "react";
import { UserPlus, Check } from "lucide-react";
import { toggleFollow, listFollowers, listFollowing, listProfileLikers, type CommunityPerson } from "@/app/actions/community";
import { toast } from "@/components/ui/toast";
import { PeopleModal } from "./people-modal";

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
  following: number;
  isMe: boolean;
  isFollowing: boolean;
  /** Visiteur non connecté : le profil reste visible, les interactions invitent à se connecter. */
  isGuest?: boolean;
  lang?: "fr" | "ar" | "en";
}

const FOLLOW_T = {
  fr: { follow: "Suivre l'aventure", following: "Aventure suivie", posts: "Publications", followers: "Abonnés", followingLabel: "Abonnements", likes: "J'aime",
        followersTitle: "Abonnés", followingTitle: "Abonnements", likesTitle: "Ont aimé",
        emptyFollowers: "Aucun abonné pour le moment.", emptyFollowing: "N'suit personne pour le moment.", emptyLikes: "Aucun j'aime pour le moment." },
  ar: { follow: "تابع الرحلة", following: "تتابع الرحلة", posts: "المنشورات", followers: "المتابِعون", followingLabel: "المتابَعون", likes: "إعجاب",
        followersTitle: "المتابِعون", followingTitle: "يتابِع", likesTitle: "أعجبهم",
        emptyFollowers: "لا يوجد متابِعون بعد.", emptyFollowing: "لا يتابع أحداً بعد.", emptyLikes: "لا إعجابات بعد." },
  en: { follow: "Follow the journey", following: "Following journey", posts: "Posts", followers: "Followers", followingLabel: "Following", likes: "Likes",
        followersTitle: "Followers", followingTitle: "Following", likesTitle: "Liked by",
        emptyFollowers: "No followers yet.", emptyFollowing: "Not following anyone yet.", emptyLikes: "No likes yet." },
} as const;

type ModalKind = "followers" | "following" | "likes" | null;

/** Carte de profil communauté — stats animées + bouton d'abonnement + listes cliquables. */
export function CommunityProfileCard({
  userId, name, roleLabel, bio, username, avatarUrl, likes, posts, followers, following: followingCountInit, isMe, isFollowing, isGuest = false, lang = "fr",
}: Props) {
  const ft = FOLLOW_T[lang];
  const [aLikes, setALikes] = useState(0);
  const [aPosts, setAPosts] = useState(0);
  const [following, setFollowing] = useState(isFollowing);
  const [followerCount, setFollowerCount] = useState(followers);
  const [pending, startTransition] = useTransition();

  // ── Modale « qui suit / qui je suis / qui a aimé » ──
  const [modal, setModal] = useState<ModalKind>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [people, setPeople] = useState<CommunityPerson[]>([]);

  function openModal(kind: Exclude<ModalKind, null>) {
    setModal(kind);
    setModalLoading(true);
    setPeople([]);
    const loader =
      kind === "followers" ? listFollowers(userId)
      : kind === "following" ? listFollowing(userId)
      : listProfileLikers(userId);
    loader.then((res) => {
      setPeople(res.ok ? res.people : []);
      setModalLoading(false);
      if (!res.ok) toast(res.error ?? "Erreur", "error");
    });
  }

  const modalTitle = modal === "followers" ? ft.followersTitle : modal === "following" ? ft.followingTitle : ft.likesTitle;
  const modalEmpty = modal === "followers" ? ft.emptyFollowers : modal === "following" ? ft.emptyFollowing : ft.emptyLikes;

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
    if (isGuest) {
      // Invitation à se connecter, sans bloquer la consultation du profil.
      window.location.href = `/login?redirect=/communaute/u/${userId}`;
      return;
    }
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
        <div className="px-6 pt-6 pb-6">
          {/* Avatar + bouton suivre (plus de bandeau violet : la photo est mise en avant) */}
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="w-24 h-24 rounded-full overflow-hidden bg-orange-DEFAULT grid place-items-center text-white text-3xl font-bold shadow-lg ring-1 ring-cream-200 dark:ring-white/10">
              {avatarUrl ? <img src={avatarUrl} alt={name} className="w-full h-full object-cover" /> : initial}
            </div>
            {!isMe && (
              <button onClick={onFollow} disabled={pending}
                className={`inline-flex items-center gap-1.5 rounded-full px-5 py-2 text-sm font-semibold transition-colors disabled:opacity-70 ${
                  following
                    ? "bg-violet-100 text-violet-700 border border-violet-200 dark:bg-white/10 dark:text-white dark:border-white/20"
                    : "bg-violet-600 text-white hover:bg-violet-700"}`}>
                {following ? <><Check size={15} /> {ft.following}</> : <><UserPlus size={15} /> {ft.follow}</>}
              </button>
            )}
          </div>

          {/* Nom + rôle + bio */}
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight font-playfair">{name}</h2>
          {username && <p className="text-sm text-gray-400 dark:text-white/40 font-dm">@{username}</p>}
          <p className="text-orange-600 dark:text-orange-300 text-sm font-semibold mt-1 font-dm">{roleLabel}</p>
          {bio && <p className="text-gray-500 dark:text-white/60 text-sm leading-relaxed mt-3 font-dm">{bio}</p>}

          {/* Stats — Abonnés / Abonnements / J'aime sont cliquables (voir qui). */}
          <div className="grid grid-cols-4 gap-1 mt-6 py-4 border-t border-b border-cream-200 dark:border-white/10">
            <div className="text-center px-1">
              <div className="text-xl font-bold text-gray-900 dark:text-white">{aPosts}</div>
              <div className="text-[11px] text-gray-400 dark:text-white/50 font-dm mt-0.5">{ft.posts}</div>
            </div>
            <button type="button" onClick={() => openModal("followers")}
              className="text-center px-1 rounded-xl hover:bg-cream-50 dark:hover:bg-white/5 transition-colors">
              <div className="text-xl font-bold text-gray-900 dark:text-white">{fmt(followerCount)}</div>
              <div className="text-[11px] text-gray-400 dark:text-white/50 font-dm mt-0.5">{ft.followers}</div>
            </button>
            <button type="button" onClick={() => openModal("following")}
              className="text-center px-1 rounded-xl hover:bg-cream-50 dark:hover:bg-white/5 transition-colors">
              <div className="text-xl font-bold text-gray-900 dark:text-white">{fmt(followingCountInit)}</div>
              <div className="text-[11px] text-gray-400 dark:text-white/50 font-dm mt-0.5">{ft.followingLabel}</div>
            </button>
            <button type="button" onClick={() => openModal("likes")}
              className="text-center px-1 rounded-xl hover:bg-cream-50 dark:hover:bg-white/5 transition-colors">
              <div className="text-xl font-bold text-gray-900 dark:text-white">{fmt(aLikes)}</div>
              <div className="text-[11px] text-gray-400 dark:text-white/50 font-dm mt-0.5">{ft.likes}</div>
            </button>
          </div>
        </div>
      </div>

      <PeopleModal
        open={modal !== null}
        title={modalTitle}
        loading={modalLoading}
        people={people}
        emptyLabel={modalEmpty}
        onClose={() => setModal(null)}
      />
    </div>
  );
}
