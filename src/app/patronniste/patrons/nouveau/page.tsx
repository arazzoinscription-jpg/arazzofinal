import { createAdminClient } from "@/lib/supabase/admin";
import { PatronForm } from "../patron-form";

export const metadata = { title: "Nouveau patron — Patronniste" };
export const dynamic = "force-dynamic";

export default async function NouveauPatronPage() {
  const admin = createAdminClient();
  const { data: courses } = await admin.from("courses").select("id, titre_fr").order("created_at", { ascending: false });

  return (
    <div className="text-gray-900 dark:text-white">
      <h1 className="font-playfair text-3xl font-bold mb-1">Nouveau patron</h1>
      <p className="text-gray-500 dark:text-white/50 mb-6">Renseignez les informations, attributs, fichiers et fiche produit.</p>
      <PatronForm courses={courses ?? []} />
    </div>
  );
}
