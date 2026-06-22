import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PackCreateForm, type PackCourseOption } from "./pack-create-form";

export const metadata = { title: "Nouveau pack — Arazzo Formation" };
export const dynamic = "force-dynamic";

export default async function NewPackPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Le formateur regroupe ses propres cours + les cours importés non assignés (formateur_id NULL).
  const admin = createAdminClient();
  const { data: courses } = await admin
    .from("courses").select("id, titre_fr, prix_dzd, course_categories(category:categories(name_fr))")
    .or(`formateur_id.eq.${user.id},formateur_id.is.null`)
    .order("created_at", { ascending: false });

  const options: PackCourseOption[] = (courses ?? []).map((c: any) => ({
    id: c.id,
    titre_fr: c.titre_fr,
    prix_dzd: c.prix_dzd,
    categories: ((c.course_categories as any[]) ?? [])
      .map((cc) => cc.category?.name_fr).filter(Boolean) as string[],
  }));

  return (
    <div className="max-w-3xl">
      <h1 className="font-playfair text-3xl font-bold text-gray-900 mb-2">Créer un pack de cours</h1>
      <p className="text-gray-500 mb-8 font-dm">
        Regroupez plusieurs cours en un seul pack vendu à tarif avantageux.
      </p>
      <PackCreateForm courses={options} />
    </div>
  );
}
