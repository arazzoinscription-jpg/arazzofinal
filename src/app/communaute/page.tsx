import { loadCommunityFeed } from "@/lib/community";
import { createAdminClient } from "@/lib/supabase/admin";
import { FEED_LIBRARY_ID } from "@/lib/bunny/stream";
import { CommunityFab } from "@/components/community/community-fab";
import { MobileQuickNav } from "@/components/layout/mobile-quick-nav";
import { FeedClient } from "./feed-client";

export const metadata = { title: "Communauté — Arazzo" };
export const dynamic = "force-dynamic";

export default async function CommunautePage() {
  // Feed accessible aux VISITEURS (sans inscription). L'invitation à s'inscrire
  // est gérée côté client (popup toutes les 3 vidéos, blocage à la 10ᵉ).
  const { me, items } = await loadCommunityFeed();

  let role = "guest";
  if (me) {
    const admin = createAdminClient();
    const { data: prof } = await admin.from("users").select("role").eq("id", me.id).maybeSingle();
    role = prof?.role ?? "eleve";
  }
  const isStaff = role === "formateur" || role === "patronniste" || role === "admin";

  return (
    <>
      <FeedClient items={items} meId={me?.id ?? ""} bunnyLibraryId={FEED_LIBRARY_ID} canModerate={role === "admin"} isGuest={!me} />
      {/* Bouton « + » flottant : publier une vidéo / une actualité (staff uniquement). */}
      {isStaff && <CommunityFab role={role} />}
      {/* Menu du bas en version COMPACTE (pilule centrée, icônes seules) : il reste
          accessible sur le feed sans masquer le « + », les actions ni les popups. */}
      <MobileQuickNav compact />
    </>
  );
}
