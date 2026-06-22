import { redirect } from "next/navigation";
import { loadFeed } from "@/lib/feed";
import { Feed } from "@/components/feed/Feed";
import { CommunityFab } from "@/components/community/community-fab";
import { DashHeader } from "../dash-header";

export const metadata = { title: "Actualités — Arazzo Formation" };
export const dynamic = "force-dynamic";

export default async function ActualitesPage() {
  const { me, posts } = await loadFeed(null);
  if (!me) redirect("/login");

  return (
    <div className="max-w-2xl">
      <DashHeader index="07" eyebrow="Communauté" title="Actualités" subtitle="Le fil partagé de la communauté Arazzo." />
      <Feed posts={posts} me={me} />
      <CommunityFab role={me.role} />
    </div>
  );
}
