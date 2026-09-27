import { createClient } from "@/lib/supabase/server";
import { createPublicClient } from "@/lib/supabase/public";
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
type PresentielSnap = { slug: string; data: Record<string, unknown> | null };

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

  // Packs COMPOSÉS dans l'OS (pack_snapshots, ex. « pack-couture-1-2 ») : ajoutés
  // à la liste des packs du hub, chacun → sa page /pack/[slug]. Dédup par slug.
  try {
    const pub = createPublicClient();
    const { data: packSnaps } = await pub.from("pack_snapshots").select("slug, data");
    const connus = new Set(packs.map((p) => p.slug));
    for (const row of ((packSnaps as { slug: string; data: Record<string, any> | null }[]) ?? [])) {
      if (!row.slug || !row.data || connus.has(row.slug)) continue;
      packs.push({ slug: row.slug, name: (row.data.name as string) || row.slug, prix: daPrice(row.data.price_amount) });
    }
  } catch { /* best-effort : si rien n'est poussé, la section reste vide */ }

  // PRÉSENTIEL : autant de landings que d'offres synchronisées par l'OS (une page
  // par niveau/atelier), lues dans `presentiel_snapshots`. Best-effort : si la
  // synchro n'a rien poussé, la liste est vide et le hub retombe sur son lien par
  // défaut. Lecture ANON (RLS publique), comme la landing `/presentiel/[slug]`.
  let presentiel: Offre[] = [];
  try {
    const pub = createPublicClient();
    const { data: snaps } = await pub
      .from("presentiel_snapshots")
      .select("slug, data")
      .order("slug", { ascending: true });
    presentiel = ((snaps as PresentielSnap[]) ?? [])
      .filter((s) => s.slug && s.data)
      .map((s) => {
        const d = s.data as Record<string, any>;
        const atelier = d?.kind === "atelier";
        return {
          slug: s.slug,
          name: (d?.name as string) || s.slug,
          sous: atelier ? "Atelier · Sétif" : "Formation · petits groupes · Sétif",
        };
      });
  } catch { presentiel = []; }

  return <OffresHub online={online} packs={packs} presentiel={presentiel} />;
}
