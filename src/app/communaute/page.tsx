import { redirect } from "next/navigation";
import { loadCommunityFeed } from "@/lib/community";
import { createAdminClient } from "@/lib/supabase/admin";
import { FEED_LIBRARY_ID } from "@/lib/bunny/stream";
import { MobileQuickNav } from "@/components/layout/mobile-quick-nav";
import { CommunityFab } from "@/components/community/community-fab";
import { FeedClient } from "./feed-client";

export const metadata = { title: "Communauté — Arazzo" };
export const dynamic = "force-dynamic";

export default async function CommunautePage() {
  const { me, items } = await loadCommunityFeed();
  if (!me) redirect("/login?redirect=/communaute");

  // Le « + » de publication est réservé au staff (formateur / patronniste / admin).
  const admin = createAdminClient();
  const { data: prof } = await admin.from("users").select("role").eq("id", me.id).maybeSingle();
  const role = prof?.role ?? "eleve";
  const isStaff = role === "formateur" || role === "patronniste" || role === "admin";

  // L'ID de la library feed n'est pas secret (visible dans les URLs d'embed) —
  // contrairement à la clé API qui reste côté serveur.
  return (
    <>
      <FeedClient items={items} meId={me.id} bunnyLibraryId={FEED_LIBRARY_ID} canModerate={role === "admin"} />
      {/* Bouton « + » flottant : publier une vidéo / une actualité (staff uniquement). */}
      {isStaff && <CommunityFab role={role} />}
      {/* Menu du site en bas (mobile) : reste accessible par-dessus le feed plein écran. */}
      <MobileQuickNav />
    </>
  );
}
