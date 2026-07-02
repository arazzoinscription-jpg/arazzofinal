import { loadCommunityFeed } from "@/lib/community";
import { createAdminClient } from "@/lib/supabase/admin";
import { FEED_LIBRARY_ID } from "@/lib/bunny/stream";
import { CommunityFab } from "@/components/community/community-fab";
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
      {/* Pas de menu bas ici : le feed est plein écran et a sa propre navigation en haut
          (le menu du bas masquait le « + », les popups et le bouton de partage). */}
    </>
  );
}
