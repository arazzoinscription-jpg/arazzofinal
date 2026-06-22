"use client";

import Link from "next/link";
import { useState } from "react";
import { Film, ImageIcon, PlayCircle } from "lucide-react";
import { sourceLabel, type CommunityItem } from "@/lib/community-types";

/**
 * Tuile d'historique de profil. Fond dégradé permanent (jamais de vide noir),
 * miniature par-dessus si elle charge, et icône ▶ centrée pour les vidéos.
 * Si la miniature Bunny échoue/est absente, on retombe sur le dégradé.
 */
export function MediaTile({ item }: { item: CommunityItem }) {
  const [imgOk, setImgOk] = useState(true);
  const src = item.thumbnail ?? item.mediaUrl ?? "";

  return (
    <Link href="/communaute"
      className="relative aspect-[9/16] rounded-lg overflow-hidden block bg-gradient-to-br from-violet-800/50 to-orange-700/40">
      {src && imgOk && (
        <img src={src} alt="" loading="lazy" onError={() => setImgOk(false)}
          className="absolute inset-0 w-full h-full object-cover" />
      )}
      {item.mediaKind === "video" && (
        <span className="absolute inset-0 grid place-items-center text-white/90">
          <PlayCircle size={30} />
        </span>
      )}
      <span className="absolute top-1.5 left-1.5 text-[9px] font-bold uppercase bg-black/55 text-white px-1.5 py-0.5 rounded">
        {sourceLabel(item.sourceType)}
      </span>
      <span className="absolute bottom-1.5 right-1.5 text-white/90">
        {item.mediaKind === "video" ? <Film size={14} /> : <ImageIcon size={14} />}
      </span>
    </Link>
  );
}
