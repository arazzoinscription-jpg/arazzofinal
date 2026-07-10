import Link from "next/link";
import { cookies } from "next/headers";
import { ArrowLeft, Pencil } from "lucide-react";
import { loadProfile, loadUserMedia, loadFollowInfo, loadStudentJourney, loadCreatorPortfolio } from "@/lib/community";
import { normLang } from "@/lib/store-i18n";
import { CommunityProfileCard } from "./community-profile-card";
import { CommunityJourney } from "./community-journey";
import { CommunityPortfolio } from "./community-portfolio";
import { MediaTile } from "./media-tile";

export const metadata = { title: "Profil — Communauté Arazzo" };
export const dynamic = "force-dynamic";

const ROLE_LABEL: Record<string, string> = { admin: "Arazzo", formateur: "Formatrice", patronniste: "Patronniste", eleve: "Membre" };

export default async function CommunityProfilePage({ params }: { params: { id: string } }) {
  // Profil PUBLIC : consultable par les visiteurs (me = null), qui sont invités
  // à se connecter au moment d'interagir (bouton Suivre).
  const { me, items } = await loadUserMedia(params.id);

  const lang = normLang((await cookies()).get("lang")?.value) as "fr" | "ar" | "en";
  const profile = await loadProfile(params.id);
  const name = profile?.nom ?? "Membre";
  const isMe = me?.id === params.id;

  const likes = items.reduce((s, i) => s + i.likeCount, 0);
  const { followers, following, isFollowing } = await loadFollowInfo(params.id, me?.id ?? null);

  // Créateur (formateur / patronniste / admin) → portfolio de ses créations.
  // Élève → parcours d'apprentissage.
  const role = profile?.role ?? "eleve";
  const isCreator = role === "formateur" || role === "patronniste" || role === "admin";
  const portfolio = isCreator ? await loadCreatorPortfolio(params.id, role) : null;
  const journey = isCreator ? null : await loadStudentJourney(params.id, lang);

  return (
    <div className="min-h-[100dvh] bg-[#0b0818] text-white">
      <div className="max-w-3xl mx-auto px-4 pt-[max(16px,env(safe-area-inset-top))] pb-24">
        <div className="flex items-center justify-between mb-6">
          <Link href="/communaute" className="inline-flex items-center gap-1.5 text-white/70 hover:text-white text-sm">
            <ArrowLeft size={16} /> Retour au feed
          </Link>
          {isMe && (
            <Link href="/communaute/profil"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-orange-300 hover:text-orange-200 border border-white/15 rounded-full px-3 py-1.5">
              <Pencil size={14} /> Éditer mon profil
            </Link>
          )}
        </div>

        <CommunityProfileCard
          userId={params.id}
          name={name}
          roleLabel={ROLE_LABEL[profile?.role ?? "eleve"] ?? "Membre"}
          bio={profile?.bio ?? null}
          username={profile?.username ?? null}
          avatarUrl={profile?.avatar_url ?? null}
          likes={likes}
          posts={items.length}
          followers={followers}
          following={following}
          isMe={isMe}
          isFollowing={isFollowing}
          isGuest={!me}
          lang={lang}
        />

        {/* Créateur → portfolio (formations / patrons) ; élève → parcours d'apprentissage */}
        {portfolio
          ? <CommunityPortfolio portfolio={portfolio} />
          : journey && <CommunityJourney journey={journey} lang={lang} />}

        {/* Historique des publications */}
        <div className="mt-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-white/90">Historique des publications</h2>
            <span className="text-sm text-white/50">{items.length}</span>
          </div>

          {items.length === 0 ? (
            <p className="text-white/50 font-dm text-center py-12">Aucune publication pour le moment.</p>
          ) : (
            <div className="grid grid-cols-3 gap-1.5">
              {items.map((it) => <MediaTile key={it.id} item={it} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
