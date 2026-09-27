import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PackLanding from "./pack-landing";

// Landing PACK native (24/7, backend Supabase du LMS). Lit course_packs +
// course_pack_items + les cours inclus. Affiche les formations réunies côte à
// côte, le prix normal BARRÉ → prix pack, et l'économie. L'inscription passe par
// la boutique du LMS (/boutique/<slug>) — aucun tunnel, aucune dépendance à OS.

export const dynamic = "force-dynamic";

// Les slugs de pack peuvent être en arabe → encodés dans l'URL. On décode avant
// de comparer en base (comme la page formations/[slug]).
function decodeSlug(s: string) { try { return decodeURIComponent(s); } catch { return s; } }

type Course = { id: string; titre_fr: string | null; prix_dzd: number | null; slug: string | null };
type Pack = {
  id: string; slug: string | null; titre_fr: string | null; titre_ar: string | null;
  description_fr: string | null; prix_dzd: number | null; thumbnail: string | null;
};

async function loadPack(slug: string) {
  const supabase = await createClient();
  const { data: pack } = await supabase
    .from("course_packs")
    .select("id, slug, titre_fr, titre_ar, description_fr, prix_dzd, thumbnail, published")
    .eq("slug", slug)
    .eq("published", true)
    .maybeSingle();
  if (!pack) return null;

  const { data: items } = await supabase
    .from("course_pack_items")
    .select("course_id")
    .eq("pack_id", (pack as Pack).id);
  const ids = [...new Set((items ?? []).map((i) => i.course_id).filter(Boolean))];

  let courses: Course[] = [];
  if (ids.length) {
    const { data } = await supabase
      .from("courses")
      .select("id, titre_fr, prix_dzd, slug")
      .in("id", ids);
    courses = (data as Course[]) ?? [];
  }

  // Le pack se vend via un produit boutique de type "bundle" dont `files`
  // contient "pack:<id>". Son slug (≠ course_packs.slug) est la page d'achat.
  let buySlug: string | null = null;
  try {
    const { data: bundles } = await supabase
      .from("products")
      .select("slug, files, is_active")
      .eq("type", "bundle")
      .eq("is_active", true);
    const prod = (bundles ?? []).find((p) => ((p.files as string[]) ?? []).includes(`pack:${(pack as Pack).id}`));
    buySlug = (prod as { slug?: string } | undefined)?.slug ?? null;
  } catch { buySlug = null; }

  const cumul = courses.reduce((s, c) => s + (Number(c.prix_dzd) || 0), 0);
  const prix = Number((pack as Pack).prix_dzd) || 0;
  const eco = cumul > prix ? cumul - prix : 0;
  return { pack: pack as Pack, courses, cumul, prix, eco, buySlug };
}

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const supabase = await createClient();
  const { data } = await supabase.from("course_packs").select("titre_fr").eq("slug", decodeSlug(params.slug)).maybeSingle();
  const nom = (data as { titre_fr?: string } | null)?.titre_fr;
  return { title: `${nom ? `${nom} — ` : ""}Pack — Arazzo Formation` };
}

export default async function Page({ params }: { params: { slug: string } }) {
  const data = await loadPack(decodeSlug(params.slug));
  if (!data) notFound();
  const { pack, courses, cumul, prix, eco, buySlug } = data;

  return (
    <PackLanding
      data={{
        name: pack.titre_fr || "Pack",
        name_ar: pack.titre_ar,
        description: pack.description_fr,
        courses: courses.map((c) => ({ id: c.id, title: c.titre_fr || "Formation", prix: c.prix_dzd, slug: c.slug })),
        cumul, prix, eco, buySlug,
      }}
    />
  );
}
