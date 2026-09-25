import { createPublicClient } from "@/lib/supabase/public";
import PatronsLanding from "../patrons/patrons-landing";

// Vitrine PATRONS — identique à Arazzo OS `/patrons-arazzo`, 24/7 sur Vercel.
// Les patrons mis en avant (hero + grille) + les moyens de paiement viennent
// d'un INSTANTANÉ poussé par l'OS (`patron_landing_snapshot`, ligne 'default').
// L'achat et le sur-mesure déposent une commande que l'OS rapatrie au clic
// « Synchroniser ». Les fiches produit `/patrons/[id]` (natives LMS) et la
// boutique `/patrons` restent inchangées.

export const dynamic = "force-dynamic";

export default async function Page() {
  const supabase = createPublicClient();
  const { data: row } = await supabase
    .from("patron_landing_snapshot")
    .select("data")
    .eq("id", "default")
    .maybeSingle();

  const data = (row?.data ?? null) as any;
  const hasContent = data && ((data.hero?.length ?? 0) > 0 || (data.grid?.length ?? 0) > 0);

  if (!hasContent) {
    return (
      <main className="min-h-screen grid place-items-center p-8 text-center bg-[#faf8ff] text-[#4b4266]">
        <div>
          <p className="text-lg">Nos patrons arrivent très bientôt. 🌸</p>
          <p className="text-sm mt-1 text-gray-400">Revenez dans un instant.</p>
        </div>
      </main>
    );
  }

  return <PatronsLanding data={data} />;
}
