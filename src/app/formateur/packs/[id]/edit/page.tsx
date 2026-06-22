import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PackCreateForm, type PackCourseOption, type PackInitial } from "../../nouveau/pack-create-form";

export const metadata = { title: "Modifier le pack — Arazzo Formation" };
export const dynamic = "force-dynamic";

export default async function EditPackPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: prof } = await supabase.from("users").select("role").eq("id", user.id).single();
  const isAdmin = prof?.role === "admin";

  const admin = createAdminClient();
  const { data: pack } = await admin
    .from("course_packs")
    .select("id, titre_fr, titre_ar, description_fr, prix_dzd, prix_eur, thumbnail, published, formateur_id, items:course_pack_items(course_id)")
    .eq("id", params.id)
    .single();

  if (!pack) notFound();
  // Autorisation : propriétaire ou admin.
  if (pack.formateur_id !== user.id && !isAdmin) redirect("/formateur/packs");

  // Cours disponibles : ceux du formateur + les cours importés non assignés.
  const { data: courses } = await admin
    .from("courses")
    .select("id, titre_fr, prix_dzd, course_categories(category:categories(name_fr))")
    .or(`formateur_id.eq.${user.id},formateur_id.is.null`)
    .order("created_at", { ascending: false });

  const options: PackCourseOption[] = (courses ?? []).map((c: any) => ({
    id: c.id,
    titre_fr: c.titre_fr,
    prix_dzd: c.prix_dzd,
    categories: ((c.course_categories as any[]) ?? []).map((cc) => cc.category?.name_fr).filter(Boolean) as string[],
  }));

  const initial: PackInitial = {
    titre_fr: pack.titre_fr ?? "",
    titre_ar: pack.titre_ar ?? "",
    description_fr: pack.description_fr ?? "",
    prix_dzd: pack.prix_dzd != null ? String(pack.prix_dzd) : "",
    prix_eur: pack.prix_eur != null ? String(pack.prix_eur) : "",
    thumbnail: pack.thumbnail ?? "",
    courseIds: ((pack.items as any[]) ?? []).map((it) => it.course_id as string),
  };

  return (
    <div className="max-w-3xl">
      <h1 className="font-playfair text-3xl font-bold text-gray-900 mb-2">Modifier le pack</h1>
      <p className="text-gray-500 mb-8 font-dm">Mettez à jour « {pack.titre_fr} » : infos, prix et cours inclus.</p>
      <PackCreateForm courses={options} packId={pack.id} initial={initial} />
    </div>
  );
}
