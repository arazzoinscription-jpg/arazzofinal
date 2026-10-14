import Link from "next/link";
import { cookies } from "next/headers";
import { Pencil } from "lucide-react";
import { loadProfile, loadUserMedia, loadFollowInfo, loadStudentJourney, loadCreatorPortfolio } from "@/lib/community";
import { normLang } from "@/lib/store-i18n";
import { CommunityProfileCard } from "./community-profile-card";
import { CommunityJourney } from "./community-journey";
import { CommunityPortfolio } from "./community-portfolio";
import { MediaTile } from "./media-tile";
import { BoutonRetour } from "@/components/community/bouton-retour";
import { SignalPresenceMembre } from "@/components/presence/membres";
import { ChoixActivite, PresenceDe } from "@/components/presence/activite";
import { niveauxDuMembre } from "@/lib/niveaux-membre";

export const metadata = { title: "Profil — Communauté Arazzo" };
export const dynamic = "force-dynamic";

const ROLE_LABEL: Record<string, string> = { admin: "Arazzo", formateur: "Formatrice", patronniste: "Patronniste", eleve: "Membre" };

export default async function CommunityProfilePage({ params }: { params: { id: string } }) {
  // Profil PUBLIC : consultable par les visiteurs (me = null), qui sont invités
  // à se connecter au moment d'interagir (bouton Suivre).
  // Chargements LANCÉS ENSEMBLE (avant : 5 étapes l'une après l'autre, chacune attendant la base).
  const lang = normLang((await cookies()).get("lang")?.value) as "fr" | "ar" | "en";
  const [{ me, items }, profile] = await Promise.all([loadUserMedia(params.id), loadProfile(params.id)]);
  const name = profile?.nom ?? "Membre";
  const isMe = me?.id === params.id;

  const likes = items.reduce((s, i) => s + i.likeCount, 0);

  // Créateur (formateur / patronniste / admin) → portfolio de ses créations.
  // Élève → parcours d'apprentissage.
  const role = profile?.role ?? "eleve";
  const isCreator = role === "formateur" || role === "patronniste" || role === "admin";
  const [{ followers, following, isFollowing }, portfolio, journey, niveaux] = await Promise.all([
    loadFollowInfo(params.id, me?.id ?? null),
    isCreator ? loadCreatorPortfolio(params.id, role) : Promise.resolve(null),
    isCreator ? Promise.resolve(null) : loadStudentJourney(params.id, lang),
    // Niveau inscrit : montré aux membres connectés seulement (pas aux visiteurs).
    me && !isCreator ? niveauxDuMembre(params.id) : Promise.resolve([] as string[]),
  ]);

  return (
    <div className="min-h-[100dvh] bg-[#0b0818] text-white">
      <div className="max-w-3xl mx-auto px-4 pt-[max(16px,env(safe-area-inset-top))] pb-24">
        <div className="flex items-center justify-between mb-6">
          <BoutonRetour className="inline-flex items-center gap-1.5 text-white/70 hover:text-white text-sm" />
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

        {/* Membres connectés : en ligne ou non, ce qu'elle fait en ce moment, son niveau (temps réel, rien en base). */}
        {me ? (
          <div className="mt-4 rounded-3xl border border-white/10 bg-white/5 p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            {!isCreator ? (
              <div className="flex flex-col items-center sm:items-start gap-1.5">
                <span className="text-xs text-white/60">{niveaux.length > 1 ? "Niveaux inscrits" : "Niveau inscrit"}</span>
                <div className="flex flex-wrap gap-1.5">
                  {niveaux.length
                    ? niveaux.map((n) => <span key={n} className="px-2.5 py-1 rounded-lg text-sm font-bold bg-orange-500/20 text-orange-200">{n}</span>)
                    : <span className="text-xs text-white/50">Aucun niveau en ligne</span>}
                </div>
              </div>
            ) : <span className="text-xs text-white/60">{ROLE_LABEL[role] ?? "Membre"}</span>}
            <PresenceDe id={params.id} sombre />
          </div>
        ) : null}
        {isMe ? <div className="mt-4"><ChoixActivite sombre /></div> : null}
        {me ? <SignalPresenceMembre userId={me.id} /> : null}

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
