import { redirect } from "next/navigation";
import { loadFeed } from "@/lib/feed";
import { Feed } from "@/components/feed/Feed";

export const metadata = { title: "Actualités — Arazzo Formation" };
export const dynamic = "force-dynamic";

export default async function ActualitesPage() {
  const { me, posts } = await loadFeed(null);
  if (!me) redirect("/login");

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="font-playfair text-3xl font-bold text-gray-900">Actualités</h1>
        <p className="text-gray-500 mt-1 font-dm">Le fil partagé de la communauté Arazzo.</p>
      </div>
      <Feed posts={posts} me={me} />
    </div>
  );
}
