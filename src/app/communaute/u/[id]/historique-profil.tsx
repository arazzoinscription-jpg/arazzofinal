"use client";

import { useState } from "react";
import Link from "next/link";
import { CircleDashed, Clapperboard, MessageCircle, Play } from "lucide-react";
import type { CommunityItem } from "@/lib/community-types";
import type { StoryVue } from "@/lib/stories/regles";
import { cdnImage } from "@/lib/storage-cdn";
import { VisionneuseStories } from "@/components/stories/visionneuse-stories";
import { GrillePublications } from "./grille-publications";

type Onglet = "reels" | "stories";

/** « 17 oct. » (heure d'Algérie). */
function dateCourte(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", timeZone: "Africa/Algiers" });
}

/** Une story de l'historique, en vignette 9:16 : la photo, la miniature de la vidéo, ou le fond du texte. */
function TuileStory({ story, onOuvrir }: { story: StoryVue; onOuvrir: () => void }) {
  const [imageOk, setImageOk] = useState(true);
  const image = story.kind === "image" ? story.mediaUrl : story.kind === "video" ? story.thumbnail : null;
  const premierTexte = story.calques.find((c) => c.type === "texte");
  return (
    <button type="button" onClick={onOuvrir} aria-label={`Revoir la story du ${dateCourte(story.createdAt)}`}
      className={`relative aspect-[9/16] overflow-hidden rounded-xl bg-gradient-to-br from-[#2A0880] to-[#5B16F9] ${story.expiree ? "" : "ring-2 ring-[#FE7223]"}`}>
      {story.kind === "texte" ? (
        <span className="absolute inset-0 grid place-items-center p-2 text-center text-[11px] font-bold leading-tight text-white" style={{ background: story.fond ?? "#111111" }}>
          {premierTexte && premierTexte.type === "texte" ? premierTexte.texte.slice(0, 60) : "Aa"}
        </span>
      ) : image && imageOk ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={story.kind === "image" ? cdnImage(image) : image} alt="" loading="lazy" decoding="async" onError={() => setImageOk(false)}
          className="absolute inset-0 w-full h-full object-cover" />
      ) : null}
      {story.kind === "video" ? <Play size={18} className="absolute top-1.5 end-1.5 text-white drop-shadow" fill="currentColor" aria-hidden /> : null}
      {!story.expiree ? <span className="absolute top-1.5 start-1.5 rounded-full bg-[#FE7223] px-1.5 py-0.5 text-[9px] font-bold text-white">En ce moment</span> : null}
      {story.enAttente ? <span className="absolute top-1.5 start-1.5 rounded-full bg-amber-400 px-1.5 py-0.5 text-[9px] font-bold text-black">⏳ en attente</span> : null}
      <span className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/75 to-transparent px-1.5 pb-1 pt-4 text-[10px] font-semibold text-white">
        <span>{dateCourte(story.createdAt)}</span>
        {story.nbCommentaires ? <span className="inline-flex items-center gap-0.5"><MessageCircle size={11} aria-hidden /> {story.nbCommentaires}</span> : null}
      </span>
    </button>
  );
}

/**
 * Le bas du profil : deux onglets — « Historique Reels » (ses publications) et « Historique Stories » (toutes ses
 * stories, même passées, à revoir et à commenter). Les stories : membres connectés seulement, comme dans La Cour.
 */
export function HistoriqueProfil({ userId, nom, avatar, items, stories, meId, moderation, bibliotheque, ongletInitial }: {
  userId: string;
  nom: string;
  avatar: string | null;
  items: CommunityItem[];
  /** null : visiteuse non connectée (les stories ne lui sont pas montrées). */
  stories: StoryVue[] | null;
  meId: string | null;
  moderation: boolean;
  bibliotheque: string;
  ongletInitial: Onglet;
}) {
  const [onglet, setOnglet] = useState<Onglet>(ongletInitial);
  const [ouverte, setOuverte] = useState<number | null>(null);
  const bouton = (o: Onglet) => `flex-1 inline-flex items-center justify-center gap-1.5 whitespace-nowrap border-b-2 px-1 pb-2.5 pt-1 text-[13px] sm:text-sm font-semibold transition ${onglet === o ? "border-white text-white" : "border-transparent text-white/50 hover:text-white/80"}`;

  return (
    <div className="mt-10">
      <div role="tablist" aria-label="Historique du profil" className="flex border-b border-white/10 mb-4">
        <button type="button" role="tab" aria-selected={onglet === "reels"} onClick={() => setOnglet("reels")} className={bouton("reels")}>
          <Clapperboard size={16} aria-hidden /> Historique Reels <span className="text-white/45 font-normal">{items.length}</span>
        </button>
        <button type="button" role="tab" aria-selected={onglet === "stories"} onClick={() => setOnglet("stories")} className={bouton("stories")}>
          <CircleDashed size={16} aria-hidden /> Historique Stories {stories ? <span className="text-white/45 font-normal">{stories.length}</span> : null}
        </button>
      </div>

      {onglet === "reels" ? (
        items.length
          ? <GrillePublications items={items} bibliotheque={bibliotheque} />
          : <p className="text-white/50 font-dm text-center py-12">Aucun reel pour le moment.</p>
      ) : stories === null ? (
        <p className="text-white/60 text-center py-12 text-sm">
          <Link href={`/login?redirect=${encodeURIComponent(`/communaute/u/${userId}?onglet=stories`)}`} className="font-semibold text-orange-300 hover:text-orange-200">Connectez-vous</Link> pour voir les stories.
        </p>
      ) : stories.length ? (
        <>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
            {stories.map((s, k) => <TuileStory key={s.id} story={s} onOuvrir={() => setOuverte(k)} />)}
          </div>
          {ouverte !== null ? (
            <VisionneuseStories groupes={[{ userId, nom, avatar, stories }]} depart={0} departStory={ouverte}
              meId={meId} moderation={moderation} bibliotheque={bibliotheque} onFermer={() => setOuverte(null)} />
          ) : null}
        </>
      ) : <p className="text-white/50 font-dm text-center py-12">Aucune story pour le moment.</p>}
    </div>
  );
}
