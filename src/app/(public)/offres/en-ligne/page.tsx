import { createClient } from "@/lib/supabase/server";
import { createPublicClient } from "@/lib/supabase/public";
import OffreListe, { type Item } from "../offres-liste";

// Page SÉPARÉE « Formations en ligne » — liste les 3 niveaux (cours du LMS),
// chacun menant à sa landing `/formation/[niveau]`. Ouverte depuis le bouton du
// hub `/offres`.

const NIVEAUX = [
  { slug: "niveau-1", id: "23bee490-103a-492d-9253-256178658e02", sous: "Débutante — bases & vêtements du quotidien" },
  { slug: "niveau-2", id: "b100190c-4f95-4f63-bd22-7a561f9666de", sous: "Intermédiaire — classique & tenues de soirée" },
  { slug: "niveau-3", id: "de1da439-6dc9-4cf0-9526-e44af4c5073b", sous: "Avancée — modélisme & pièces complexes" },
];

export const dynamic = "force-dynamic";

const daPrice = (n: number | null | undefined) =>
  n ? `${Number(n).toLocaleString("fr-FR")} DA` : null;

export default async function Page() {
  const supabase = await createClient();
  const { data: courses } = await supabase
    .from("courses")
    .select("id, titre_fr, prix_dzd")
    .in("id", NIVEAUX.map((n) => n.id));
  const byId = new Map((courses ?? []).map((c) => [c.id, c]));

  const items: Item[] = NIVEAUX.map((n) => {
    const c = byId.get(n.id);
    return { slug: n.slug, name: c?.titre_fr || n.slug, sous: n.sous, prix: daPrice(c?.prix_dzd) };
  });

  // Packs à prix réduit — UNIQUEMENT ceux COMPOSÉS dans l'OS (pack_snapshots).
  // Chacun → sa page /pack/[slug] (détail des niveaux + prix barré). Comme le hub OS.
  const packs: Item[] = [];
  const connus = new Set<string>();
  try {
    const pub = createPublicClient();
    const { data } = await pub.from("pack_snapshots").select("slug, data");
    for (const row of ((data as { slug: string; data: Record<string, any> | null }[]) ?? [])) {
      if (!row.slug || !row.data || row.data.active === false || connus.has(row.slug)) continue;
      connus.add(row.slug);
      const members = Array.isArray(row.data.member_slugs) ? row.data.member_slugs.join(" + ") : null;
      packs.push({ slug: row.slug, name: row.data.name || row.slug, sous: members, prix: daPrice(row.data.price_amount) });
    }
  } catch { /* best-effort : si rien n'est poussé, pas de pack */ }

  return <OffreListe kind="online" items={items} packs={packs} />;
}
