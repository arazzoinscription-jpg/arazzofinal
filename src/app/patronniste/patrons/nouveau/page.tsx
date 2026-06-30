import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PatronForm, type PatronInit } from "../patron-form";

export const metadata = { title: "Nouveau patron — Patronniste" };
export const dynamic = "force-dynamic";

/** Pré-remplit le formulaire depuis une commande sur-mesure / placement livrée. */
async function prefillFromOrder(admin: ReturnType<typeof createAdminClient>, orderId: string, userId: string): Promise<PatronInit | null> {
  const { data: o } = await admin
    .from("patron_custom_orders")
    .select("id, titre, tissu, taille, mesures, patronniste_id")
    .eq("id", orderId).maybeSingle();
  if (!o) return null;
  // Sécurité : seulement la patronniste en charge (ou non assignée) peut pré-remplir.
  if (o.patronniste_id && o.patronniste_id !== userId) return null;
  const m = (o.mesures ?? {}) as Record<string, any>;
  const baseTitre = String(o.titre || "").replace(/^(Placement sur mesure|Patron sur mesure|Impression A0[^—]*)\s*—\s*/i, "").trim();
  return {
    titre: baseTitre || String(o.titre || ""),
    tailles: o.taille || m.taille_choisie || null,
    tissu: o.tissu || (m.tissu?.matiere ?? null),
    description: "Patron issu d'une commande sur mesure.",
  };
}

// Numéro de référence auto : max(numero numérique) + 1, base 1001.
async function nextReference(admin: ReturnType<typeof createAdminClient>): Promise<string> {
  const { data } = await admin.from("patrons").select("numero");
  const max = (data ?? []).reduce((m, r) => {
    const n = parseInt(String((r as { numero?: string | null }).numero ?? "").replace(/\D/g, ""), 10);
    return Number.isFinite(n) && n > m ? n : m;
  }, 1000);
  return String(max + 1);
}

export default async function NouveauPatronPage({ searchParams }: { searchParams: { fromOrder?: string } }) {
  const admin = createAdminClient();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [{ data: courses }, nextNumero] = await Promise.all([
    admin.from("courses").select("id, titre_fr").order("created_at", { ascending: false }),
    nextReference(admin),
  ]);

  const init = searchParams.fromOrder && user
    ? (await prefillFromOrder(admin, searchParams.fromOrder, user.id)) ?? {}
    : {};

  return (
    <div className="text-gray-900 dark:text-white">
      <h1 className="font-playfair text-3xl font-bold mb-1">Nouveau patron</h1>
      <p className="text-gray-500 dark:text-white/50 mb-6">
        {searchParams.fromOrder
          ? "Pré-rempli depuis une commande sur mesure. Joignez le PDF, le prix et la fiche, puis publiez."
          : "Renseignez les informations, attributs, fichiers et fiche produit."}
      </p>
      <PatronForm init={init} courses={courses ?? []} nextNumero={nextNumero} />
    </div>
  );
}
