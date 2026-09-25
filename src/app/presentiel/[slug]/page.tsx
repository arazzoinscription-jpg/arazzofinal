import { createAdminClient } from "@/lib/supabase/admin";
import PresentielLanding from "./presentiel-landing";

// Landing PRÉSENTIELLE — identique à Arazzo OS, 24/7 sur Vercel (sans tunnel).
// Les données (places, groupes, formules, centre, textes bilingues) viennent
// d'un INSTANTANÉ que l'OS pousse dans Supabase (`presentiel_snapshots`) via son
// bouton « Synchroniser ». On lit via le service role (bypass RLS) côté serveur.

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = createAdminClient();
  const { data: row } = await supabase
    .from("presentiel_snapshots")
    .select("data")
    .eq("slug", slug)
    .maybeSingle();

  // Pas encore synchronisée (ou offre non ouverte) : message sobre, bilingue.
  if (!row?.data) {
    return (
      <main className="min-h-screen grid place-items-center p-8 text-center bg-[#f6f3ff] text-[#4A4468]">
        <div>
          <p className="text-lg">Cette offre n’est pas ouverte pour le moment.</p>
          <p className="text-sm mt-1" dir="rtl">هذا التكوين غير مفتوح حاليًا.</p>
        </div>
      </main>
    );
  }

  // On garantit que le slug voyage dans les données (l'UI en a besoin pour le
  // formulaire et le rafraîchissement), même si un vieil instantané ne l'a pas.
  const data = { slug, ...(row.data as Record<string, unknown>) };
  return <PresentielLanding data={data} />;
}
