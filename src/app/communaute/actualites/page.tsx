import { redirect } from "next/navigation";
import { loadFeed } from "@/lib/feed";
import { Feed } from "@/components/feed/Feed";
import { CommunityFab } from "@/components/community/community-fab";
import { MobileQuickNav } from "@/components/layout/mobile-quick-nav";
import { CommunityHeader } from "../community-header";

export const metadata = { title: "Actualités — Communauté Arazzo" };
export const dynamic = "force-dynamic";

/** Actualités DANS l'environnement communauté (même en-tête + menu que le feed). */
export default async function CommunauteActualitesPage() {
  const { me, posts } = await loadFeed(null);
  if (!me) redirect("/login");

  return (
    <div className="min-h-[100dvh] bg-[#0b0818] text-white">
      <CommunityHeader />
      <div className="max-w-2xl mx-auto px-4 pt-28 pb-28">
        <h1 className="font-playfair text-2xl font-bold mb-1">Actualités</h1>
        <p className="text-white/50 font-dm text-sm mb-5">Le fil partagé de la communauté Arazzo.</p>
        <Feed posts={posts} me={me} />
      </div>
      <CommunityFab role={me.role} />
      <MobileQuickNav />
    </div>
  );
}
