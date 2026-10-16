import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { chargerClasseEleve } from "@/lib/classe/classe-eleve";
import { DashHeader } from "../dash-header";
import { ClasseEleveVue } from "./classe-eleve";
import { storiesActives } from "@/lib/stories/load";
import { FEED_LIBRARY_ID } from "@/lib/bunny/stream";
import { avatarSur } from "@/lib/classe/vue";

export const metadata = { title: "Ma classe — Arazzo Formation" };
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

export default async function MaClasseElevePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Camarades = membres des groupes de l'élève connectée (et eux seuls) ; seules des données de profil public
  // (pseudo, photo, niveaux en commun, progression des cours communs) sortent du serveur — jamais de statut de suivi.
  const admin = createAdminClient();
  const classe = await chargerClasseEleve(admin, user.id);
  // Stories (24 h) : les miennes, celles des enseignantes et des camarades de mes groupes.
  const { data: moi } = await admin.from("users").select("avatar_url").eq("id", user.id).maybeSingle();
  const stories = await storiesActives(admin, [user.id, ...classe.enseignantes.map((e) => e.id), ...classe.camarades.map((c) => c.id)]);
  const niveaux = [...new Set(classe.camarades.flatMap((c) => c.niveaux))].sort();

  return (
    <div>
      <DashHeader index="16" eyebrow="Apprentissage" title="Ma classe" subtitle="Votre enseignante et les camarades de votre groupe." />
      {classe.cours.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 border border-cream-200 text-center text-gray-500">
          <div className="text-4xl mb-2" aria-hidden>🎓</div>
          Vous n&apos;êtes inscrite à aucun cours pour le moment : votre classe apparaîtra dès votre inscription.
        </div>
      ) : (
        <ClasseEleveVue enseignantes={classe.enseignantes} camarades={classe.camarades} niveaux={niveaux} groupes={classe.groupes}
          stories={{ liste: stories, meId: user.id, monAvatar: avatarSur((moi?.avatar_url as string | null) ?? null), bibliotheque: FEED_LIBRARY_ID }} />
      )}
    </div>
  );
}
