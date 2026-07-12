import Link from "next/link";
import { Radio } from "lucide-react";
import { loadCommunityFeed } from "@/lib/community";
import { createAdminClient } from "@/lib/supabase/admin";
import { getActiveLiveForViewer } from "@/lib/live";
import { FEED_LIBRARY_ID } from "@/lib/bunny/stream";
import { CommunityFab } from "@/components/community/community-fab";
import { MobileQuickNav } from "@/components/layout/mobile-quick-nav";
import { FeedClient } from "./feed-client";

export const metadata = { title: "Communauté — Arazzo" };
export const dynamic = "force-dynamic";

export default async function CommunautePage() {
  // Feed 100 % PUBLIC (visiteurs inclus, sans limite ni blocage). Une invitation
  // à se connecter, toujours refermable, est gérée côté client.
  const { me, items } = await loadCommunityFeed();

  let role = "guest";
  let live = null;
  if (me) {
    const admin = createAdminClient();
    const { data: prof } = await admin.from("users").select("role").eq("id", me.id).maybeSingle();
    role = prof?.role ?? "eleve";
    live = await getActiveLiveForViewer(admin, me.id);
  }

  return (
    <>
      {/* Pastille flottante « EN DIRECT » (visible si un direct autorisé est en cours) */}
      {live && (
        <Link href="/communaute/live"
          className="fixed z-40 top-[calc(env(safe-area-inset-top)+58px)] start-1/2 -translate-x-1/2 inline-flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-full shadow-2xl ring-2 ring-white/30 animate-pulse">
          <Radio size={16} /> <span className="text-sm font-bold">EN DIRECT — {live.titre}</span>
        </Link>
      )}
      <FeedClient items={items} meId={me?.id ?? ""} bunnyLibraryId={FEED_LIBRARY_ID} canModerate={role === "admin"} isGuest={!me} />
      {/* Bouton « + » flottant : staff → vidéo/actualité ; élève → reel (≤ 2 min).
          Visible pour tout membre CONNECTÉ ; les visiteurs sont invités à se connecter. */}
      {me && <CommunityFab role={role} />}
      {/* Menu du bas en version COMPACTE (pilule centrée, icônes seules) : il reste
          accessible sur le feed sans masquer le « + », les actions ni les popups. */}
      <MobileQuickNav compact />
    </>
  );
}
