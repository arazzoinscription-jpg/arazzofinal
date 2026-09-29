import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createPublicClient } from "@/lib/supabase/public";
import { getLandingTexts } from "@/lib/landing-texts";
import FormationLanding from "../../formation/[niveau]/formation-landing";
import PackLanding from "./pack-landing";

// Landing PACK (24/7). Deux sources :
//   1) Pack COMPOSÉ dans l'OS (`pack_snapshots`, ex. « pack-couture-1-2 ») → rendu
//      comme une landing en ligne (paiement CCP/BaridiMob + preuve → OS).
//   2) Pack natif du LMS (`course_packs`) → vitrine + achat via la boutique.

export const dynamic = "force-dynamic";

function decodeSlug(s: string) { try { return decodeURIComponent(s); } catch { return s; } }

// Les 3 niveaux en ligne : mapping slug → cours du LMS (comme /offres).
const NIVEAUX: Record<string, string> = {
  "niveau-1": "23bee490-103a-492d-9253-256178658e02",
  "niveau-2": "b100190c-4f95-4f63-bd22-7a561f9666de",
  "niveau-3": "de1da439-6dc9-4cf0-9526-e44af4c5073b",
};

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
    .eq("slug", slug).eq("published", true).maybeSingle();
  if (!pack) return null;

  const { data: items } = await supabase.from("course_pack_items").select("course_id").eq("pack_id", (pack as Pack).id);
  const ids = [...new Set((items ?? []).map((i) => i.course_id).filter(Boolean))];
  let courses: Course[] = [];
  if (ids.length) {
    const { data } = await supabase.from("courses").select("id, titre_fr, prix_dzd, slug").in("id", ids);
    courses = (data as Course[]) ?? [];
  }
  let buySlug: string | null = null;
  try {
    const { data: bundles } = await supabase.from("products").select("slug, files, is_active").eq("type", "bundle").eq("is_active", true);
    const prod = (bundles ?? []).find((p) => ((p.files as string[]) ?? []).includes(`pack:${(pack as Pack).id}`));
    buySlug = (prod as { slug?: string } | undefined)?.slug ?? null;
  } catch { buySlug = null; }
  const cumul = courses.reduce((s, c) => s + (Number(c.prix_dzd) || 0), 0);
  const prix = Number((pack as Pack).prix_dzd) || 0;
  const eco = cumul > prix ? cumul - prix : 0;
  return { pack: pack as Pack, courses, cumul, prix, eco, buySlug };
}

// Pack COMPOSÉ dans l'OS : lit l'instantané + résout les cours membres.
async function loadComposedPack(slug: string) {
  const pub = createPublicClient();
  const { data: row } = await pub.from("pack_snapshots").select("data").eq("slug", slug).maybeSingle();
  const d = (row?.data ?? null) as any;
  if (!d) return null;

  // Cas NOUVEAU (recommandé) : l'OS pousse les formations DÉJÀ RÉSOLUES (titre +
  // prix) + valeur/économie. On les affiche directement, sans dépendre de la table
  // du LMS ni des slugs. Repli sur l'ancienne résolution par member_slugs sinon.
  if (Array.isArray(d.pack_courses) && d.pack_courses.length) {
    const pack_courses = d.pack_courses.map((c: any, i: number) => ({
      id: c.slug || c.id || `m${i}`,
      title: c.title || c.slug || "Formation",
      prix: c.prix ?? c.price_amount ?? null,
      slug: c.slug ?? null,
      program_url: c.program_url ?? (c.slug ? `/formations/${c.slug}` : null),
    }));
    const prix = Number(d.price_amount) || 0;
    const cumul = Number(d.pack_cumul) || pack_courses.reduce((s: number, c: any) => s + (Number(c.prix) || 0), 0);
    const eco = Number(d.pack_eco) || (cumul > prix ? cumul - prix : 0);
    return { d, pack_courses, cumul, prix, eco };
  }

  const members: string[] = Array.isArray(d.member_slugs) ? d.member_slugs : [];
  const ids = members.map((m) => NIVEAUX[m]).filter(Boolean);
  // Instantané OS composé mais SANS membres exploitables : on ne devine RIEN. On
  // renvoie null → la page basculera sur le pack NATIF du LMS (course_packs), ou
  // affichera « introuvable ». À l'école de définir le pack (OS 🎁 Packs, ou LMS).
  if (!ids.length) return null;
  const supabase = await createClient();
  const { data: coursesData } = await supabase.from("courses").select("id, titre_fr, prix_dzd, slug").in("id", ids);
  const courses: Course[] = (coursesData as Course[]) ?? [];
  const byId = new Map(courses.map((c) => [c.id, c]));
  const pack_courses = members.map((m) => {
    const c = byId.get(NIVEAUX[m]);
    return { id: NIVEAUX[m] || m, title: c?.titre_fr || m, prix: c?.prix_dzd ?? null, slug: c?.slug ?? null, program_url: c?.slug ? `/formations/${c.slug}` : null };
  });
  const cumul = pack_courses.reduce((s, c) => s + (Number(c.prix) || 0), 0);
  const prix = Number(d.price_amount) || 0;
  const eco = cumul > prix ? cumul - prix : 0;
  return { d, pack_courses, cumul, prix, eco };
}

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const slug = decodeSlug(params.slug);
  const pub = createPublicClient();
  const { data: snap } = await pub.from("pack_snapshots").select("data").eq("slug", slug).maybeSingle();
  const nom = (snap?.data as any)?.name;
  return { title: `${nom ? `${nom} — ` : ""}Pack — Arazzo Formation` };
}

export default async function Page({ params }: { params: { slug: string } }) {
  const slug = decodeSlug(params.slug);

  // 1) Pack composé dans l'OS → landing en ligne (paiement CCP/preuve → OS).
  const composed = await loadComposedPack(slug);
  if (composed) {
    const { d, pack_courses, cumul, prix, eco } = composed;
    const textes = await getLandingTexts("formation");
    return (
      <FormationLanding
        textes={textes}
        data={{
          courseId: "",
          niveau: slug,           // l'OS résout ce slug de pack en plusieurs cours
          name: d.name || "Pack",
          name_ar: d.name_ar,
          tagline: d.tagline,
          price_label: prix ? `${Number(prix).toLocaleString("fr-FR")} ${d.price_currency || "DA"}` : null,
          price_amount: prix || null,
          program_url: null,
          is_pack: true,
          pack_courses,
          pack_cumul: cumul,
          pack_prix: prix,
          pack_eco: eco,
          seats: (d.seats as { total?: number; taken?: number; interested?: number } | null) ?? null,
        }}
      />
    );
  }

  // 2) Pack natif du LMS → vitrine + achat boutique.
  const data = await loadPack(slug);
  if (!data) notFound();
  const { pack, courses, cumul, prix, eco, buySlug } = data;
  const textes = await getLandingTexts("pack");
  return (
    <PackLanding
      textes={textes}
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
