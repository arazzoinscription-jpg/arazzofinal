import { createPublicClient } from "@/lib/supabase/public";
import OffreListe, { type Item } from "../offres-liste";

// Page SÉPARÉE « Formations en présentiel » — liste TOUTES les offres
// présentielles synchronisées par l'OS (`presentiel_snapshots`), chacune menant
// à sa landing `/presentiel/[slug]`. Ouverte depuis le bouton du hub `/offres`.

export const dynamic = "force-dynamic";

type Snap = { slug: string; data: Record<string, any> | null };

export default async function Page() {
  let items: Item[] = [];
  try {
    const pub = createPublicClient();
    const { data: snaps } = await pub
      .from("presentiel_snapshots")
      .select("slug, data")
      .order("slug", { ascending: true });
    items = ((snaps as Snap[]) ?? [])
      .filter((s) => s.slug && s.data)
      .map((s) => {
        const d = s.data as Record<string, any>;
        const atelier = d?.kind === "atelier";
        const prix = d?.price_month != null
          ? `${Number(d.price_month).toLocaleString("fr-FR")} ${d.price_currency ?? "DZD"}/mois`
          : null;
        return {
          slug: s.slug,
          name: (d?.name as string) || s.slug,
          sous: atelier ? "Atelier · Sétif" : "Formation · petits groupes · Sétif",
          prix,
        };
      });
  } catch { items = []; }

  return <OffreListe kind="presentiel" items={items} />;
}
