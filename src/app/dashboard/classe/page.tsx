import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { chargerClasseEleve } from "@/lib/classe/classe-eleve";
import { DashHeader } from "../dash-header";
import { ClasseEleveVue } from "./classe-eleve";

export const metadata = { title: "Ma classe — Arazzo Formation" };
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

export default async function MaClasseElevePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Tout est filtré par les cours de l'élève connectée ; seules des données de profil public
  // (nom, photo, niveaux en commun) sortent du serveur — jamais de progression ni de statut.
  const classe = await chargerClasseEleve(createAdminClient(), user.id);
  const niveaux = [...new Set(classe.camarades.flatMap((c) => c.niveaux))].sort();

  return (
    <div>
      <DashHeader index="16" eyebrow="Apprentissage" title="Ma classe" subtitle="Votre enseignante et vos camarades de cours." />
      {classe.cours.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 border border-cream-200 text-center text-gray-500">
          <div className="text-4xl mb-2" aria-hidden>🎓</div>
          Vous n&apos;êtes inscrite à aucun cours pour le moment : votre classe apparaîtra dès votre inscription.
        </div>
      ) : (
        <ClasseEleveVue enseignantes={classe.enseignantes} camarades={classe.camarades} niveaux={niveaux} />
      )}
    </div>
  );
}
