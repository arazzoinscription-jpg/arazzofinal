import Link from "next/link";
import { ArrowLeft, LayoutGrid } from "lucide-react";
import { CommunityTabs } from "./community-tabs";

/**
 * En-tête sombre partagé des pages communauté (actualités, groupes) : même look
 * et même menu que le feed → sensation d'un seul environnement.
 */
export function CommunityHeader() {
  return (
    <div className="fixed top-0 inset-x-0 z-30 pt-[max(10px,env(safe-area-inset-top))] pb-2 bg-[#0b0818]/95 backdrop-blur-md border-b border-white/10">
      <div className="flex items-center gap-2 px-3">
        <Link href="/communaute" aria-label="Retour au feed"
          className="w-9 h-9 grid place-items-center rounded-full bg-black/40 text-white backdrop-blur shrink-0"><ArrowLeft size={18} /></Link>
        <Link href="/" className="font-playfair text-white font-bold text-base drop-shadow shrink-0">Arazzo</Link>
        <div className="flex-1" />
        <Link href="/dashboard" aria-label="Mon espace"
          className="w-9 h-9 grid place-items-center rounded-full bg-black/40 text-white backdrop-blur shrink-0"><LayoutGrid size={17} /></Link>
      </div>
      <div className="mt-1.5"><CommunityTabs /></div>
    </div>
  );
}
