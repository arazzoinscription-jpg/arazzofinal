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

  const { data: prof } = await supabase.from("users").select("role").eq("id", user.id).single();
  const isAdmin = prof?.role === "admin";

  // Le formateur regroupe ses propres cours ; l'admin peut piocher dans tous les cours
  const admin = createAdminClient();
  let query = admin.from("courses").select("id, titre_fr, prix_dzd").order("created_at", { ascending: false });
  if (!isAdmin) query = query.eq("formateur_id", user.id);
  const { data: courses } = await query;

  return (
    <div className="max-w-3xl">
      <h1 className="font-playfair text-3xl font-bold text-gray-900 mb-2">Créer un pack de cours</h1>
      <p className="text-gray-500 mb-8 font-dm">
        Regroupez plusieurs cours en un seul pack vendu à tarif avantageux.
      </p>
      <PackCreateForm courses={(courses as PackCourseOption[]) ?? []} />
    </div>
  );
}
