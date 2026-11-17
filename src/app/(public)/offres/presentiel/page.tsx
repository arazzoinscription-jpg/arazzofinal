import { createPublicClient } from "@/lib/supabase/public";
import OffreListe, { type Item } from "../offres-liste";
import { niveauDe, nomCourtAtelier, nomCourtNiveau } from "@/lib/noms-courts-ar";
import { unstable_noStore as noStore } from "next/cache";

// Page SÉPARÉE « Formations en présentiel » — liste TOUTES les offres
// présentielles synchronisées par l'OS (`presentiel_snapshots`), chacune menant
// à sa landing `/presentiel/[slug]`. Ouverte depuis le bouton du hub `/offres`.

export const dynamic = "force-dynamic";

type Snap = { slug: string; data: Record<string, any> | null };

/** Le centre d'une offre présentielle : celui poussé par l'OS, sinon déduit de la ville (Sétif par défaut). */
function lieuDe(d: Record<string, any> | null | undefined): "setif" | "eulma" {
  if (d?.location === "eulma" || d?.location === "setif") return d.location;
  return /eulma|علمة/i.test(String(d?.city ?? "")) ? "eulma" : "setif";
}

export default async function Page({ searchParams }: { searchParams?: { lieu?: string } }) {
  // Relire la base à CHAQUE visite : sinon Vercel resservait la liste d'avant la synchro (El Eulma invisible).
  noStore();
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
        const ville = (d?.city as string) || (lieuDe(d) === "eulma" ? "El Eulma" : "Sétif");
        return {
          slug: s.slug,
          name: (d?.name as string) || s.slug,
          sous: atelier ? `Atelier · ${ville}` : `Formation · petits groupes · ${ville}`,
          prix,
          lieu: lieuDe(d),
          nameAr: atelier ? nomCourtAtelier(d?.name_ar, d?.name) : (nomCourtNiveau(niveauDe(d?.level, s.slug)) ?? nomCourtAtelier(d?.name_ar, d?.name)),
          sousAr: `${atelier ? "🧵 ورشة" : "👭 فوج صغير"} · ${lieuDe(d) === "eulma" ? "العلمة" : "سطيف"}`,
          prixAr: d?.price_month != null ? `${d.price_month} دج/شهر` : null,
        };
      });
  } catch { items = []; }

  // Réparation des machines : sa page dédiée /reparation-machines (vidéo, photos), dans les DEUX centres,
  // même tant que l'offre n'est pas ouverte dans l'OS (le prix s'affiche sur la page dédiée).
  const rep = (slug: string, lieu: "setif" | "eulma"): Item => ({
    slug, lieu, href: "/reparation-machines",
    name: "Réparation des machines à coudre — 3 jours",
    sous: `Formation accélérée · niveau 0 · ${lieu === "eulma" ? "El Eulma" : "Sétif"}`,
    prix: null,
    nameAr: "تصليح ماشينات الخياطة — 3 أيام",
    sousAr: `🛠️ تكوين مكثّف · ${lieu === "eulma" ? "العلمة" : "سطيف"}`,
    prixAr: null,
  });
  items = [
    ...items.filter((i) => !i.slug.startsWith("reparation-machines")),
    rep("reparation-machines", "setif"),
    rep("reparation-machines-eulma", "eulma"),
  ];

  const lieu = searchParams?.lieu === "eulma" || searchParams?.lieu === "setif" ? searchParams.lieu : null;
  return <OffreListe kind="presentiel" items={items} lieu={lieu} />;
}
