import { createAdminClient } from "@/lib/supabase/admin";
import { PatronForm } from "../patron-form";

export const metadata = { title: "Nouveau patron — Patronniste" };
export const dynamic = "force-dynamic";

// Numéro de référence auto : max(numero numérique) + 1, base 1001.
async function nextReference(admin: ReturnType<typeof createAdminClient>): Promise<string> {
  const { data } = await admin.from("patrons").select("numero");
  const max = (data ?? []).reduce((m, r) => {
    const n = parseInt(String((r as { numero?: string | null }).numero ?? "").replace(/\D/g, ""), 10);
    return Number.isFinite(n) && n > m ? n : m;
  }, 1000);
  return String(max + 1);
}

export default async function NouveauPatronPage() {
  const admin = createAdminClient();
  const [{ data: courses }, nextNumero] = await Promise.all([
    admin.from("courses").select("id, titre_fr").order("created_at", { ascending: false }),
    nextReference(admin),
  ]);

  return (
    <div className="text-gray-900 dark:text-white">
      <h1 className="font-playfair text-3xl font-bold mb-1">Nouveau patron</h1>
      <p className="text-gray-500 dark:text-white/50 mb-6">Renseignez les informations, attributs, fichiers et fiche produit.</p>
      <PatronForm courses={courses ?? []} nextNumero={nextNumero} />
    </div>
  );
}
