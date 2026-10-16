import Link from "next/link";
import { Radio } from "lucide-react";
import { loadCommunityFeed, loadResultatsRecents } from "@/lib/community";
import { AlerteResultats } from "@/components/community/alerte-resultats";
import { createAdminClient } from "@/lib/supabase/admin";
import { getActiveLiveForViewer } from "@/lib/live";
import { FEED_LIBRARY_ID } from "@/lib/bunny/stream";
import { CommunityFab } from "@/components/community/community-fab";
import { MobileQuickNav } from "@/components/layout/mobile-quick-nav";
import { loadFeedWelcome } from "@/lib/feed-welcome";
import { FeedClient } from "./feed-client";
import { MemoirePositionFeed } from "@/components/community/memoire-position-feed";
import { SignalPresenceMembre } from "@/components/presence/membres";
import { BarreStories } from "@/components/stories/barre-stories";
import { enseignantesDe, storiesActives } from "@/lib/stories/load";
import { getRoles } from "@/lib/roles";
import { avatarSur } from "@/lib/classe/vue";
import type { ReactNode } from "react";

export const metadata = { title: "Communauté — Arazzo" };
export const dynamic = "force-dynamic";
// Le code promo de l'accueil est relu à CHAQUE visite (jamais un code expiré servi depuis le cache de données).
export const fetchCache = "force-no-store";

export default async function CommunautePage() {
  // Feed 100 % PUBLIC (visiteurs inclus, sans limite ni blocage). Une invitation
  // à se connecter, toujours refermable, est gérée côté client.
  const [{ me, items }, resultats] = await Promise.all([loadCommunityFeed(), loadResultatsRecents()]);

  // L'accueil du feed (test de niveau + code promo) ne concerne que les visiteuses non connectées.
  const welcome = me ? null : await loadFeedWelcome();

  let role = "guest";
  let live = null;
  let barreStories: ReactNode = null;
  if (me) {
    const admin = createAdminClient();
    // Rôle, direct en cours et stories : lus EN MÊME TEMPS (avant : l'un après l'autre).
    const [{ data: prof }, enDirect, stories, enseignantes] = await Promise.all([
      admin.from("users").select("role, roles, avatar_url").eq("id", me.id).maybeSingle(),
      getActiveLiveForViewer(admin, me.id),
      storiesActives(admin, null),
      enseignantesDe(admin, me.id),
    ]);
    role = prof?.role ?? "eleve";
    live = enDirect;
    // Barre de stories en haut du feed (membres connectés) : l'enseignante d'abord, puis l'équipe, « Ma story », les autres.
    const roles = getRoles(prof);
    barreStories = (
      <BarreStories variante="feed" titre="Stories" stories={stories} meId={me.id}
        moiEquipe={roles.some((r) => r === "formateur" || r === "admin")} moderation={roles.includes("admin")}
        monAvatar={avatarSur((prof?.avatar_url as string | null) ?? null)} enseignantes={enseignantes} bibliotheque={FEED_LIBRARY_ID} />
    );
  }

  return (
    <>
      {/* Pastille flottante « EN DIRECT » (visible si un direct autorisé est en cours) */}
      {live && (
        <Link href="/communaute/live" style={{ top: "calc(var(--feed-haut, calc(env(safe-area-inset-top) + 104px)) + 8px)" }}
          className="fixed z-40 start-1/2 -translate-x-1/2 inline-flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-full shadow-2xl ring-2 ring-white/30 animate-pulse">
          <Radio size={16} /> <span className="text-sm font-bold">EN DIRECT — {live.titre}</span>
        </Link>
      )}
      {/* Retour d'un profil : on revient à la même vidéo (sans toucher au lecteur du feed). */}
      <MemoirePositionFeed />
      {/* « Bravo ! … a terminé son modèle » : 24 h après la publication du résultat. */}
      <AlerteResultats resultats={resultats} bibliotheque={FEED_LIBRARY_ID} decalage={live ? 52 : 0} />
      {me && <SignalPresenceMembre userId={me.id} />}
      <FeedClient items={items} meId={me?.id ?? ""} bunnyLibraryId={FEED_LIBRARY_ID} canModerate={role === "admin"} isGuest={!me} welcome={welcome} stories={barreStories} />
      {/* Bouton « + » flottant : staff → vidéo/actualité ; élève → reel (≤ 2 min).
          Visible pour tout membre CONNECTÉ ; les visiteurs sont invités à se connecter. */}
      {me && <CommunityFab role={role} />}
      {/* Menu du bas en version COMPACTE (pilule centrée, icônes seules) : il reste
          accessible sur le feed sans masquer le « + », les actions ni les popups. */}
      <MobileQuickNav compact />
    </>
  );
}
