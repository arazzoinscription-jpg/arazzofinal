import { createClient } from "@/lib/supabase/server";
import OffresHub, { type Offre } from "./offres-hub";

// Hub NATIF (24/7) de toutes les offres, au DESIGN de l'OS (kit `pl-` partagé,
// bilingue). Liste les 3 niveaux → landings natives, les packs publiés → boutique,
// + accès patronage et présentiel. Données lues dans Supabase, rendu par OffresHub.
const NIVEAUX = [
  { slug: "niveau-1", id: "23bee490-103a-492d-9253-256178658e02", sous: "Débutante — bases & vêtements du quotidien" },
  { slug: "niveau-2", id: "b100190c-4f95-4f63-bd22-7a561f9666de", sous: "Intermédiaire — classique & tenues de soirée" },
  { slug: "niveau-3", id: "de1da439-6dc9-4cf0-9526-e44af4c5073b", sous: "Avancée — modélisme & pièces complexes" },
];

export const dynamic = "force-dynamic";

type Pack = { id: string; slug: string | null; titre_fr: string | null; prix_dzd: number | null };

const daPrice = (n: number | null | undefined) =>
  n ? `${Number(n).toLocaleString("fr-FR")} DA` : null;

export default async function Page() {
  const supabase = await createClient();
  const { data: courses } = await supabase
    .from("courses")
    .select("id, titre_fr, prix_dzd")
    .in("id", NIVEAUX.map((n) => n.id));
  const byId = new Map((courses ?? []).map((c) => [c.id, c]));

  // Packs publiés (24/7). Best-effort : si la table diverge, on n'affiche pas la section.
  let packsRaw: Pack[] = [];
  try {
    const { data } = await supabase
      .from("course_packs")
      .select("id, slug, titre_fr, prix_dzd")
      .eq("published", true)
      .order("created_at", { ascending: false });
    packsRaw = (data as Pack[]) ?? [];
  } catch { packsRaw = []; }

  const online: Offre[] = NIVEAUX.map((n) => {
    const c = byId.get(n.id);
    return { slug: n.slug, name: c?.titre_fr || n.slug, sous: n.sous, prix: daPrice(c?.prix_dzd) };
  });
  const packs: Offre[] = packsRaw
    .filter((p) => p.slug)
    .map((p) => ({ slug: p.slug as string, name: p.titre_fr || "Pack", prix: daPrice(p.prix_dzd) }));

  return <OffresHub online={online} packs={packs} />;
}
