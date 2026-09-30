import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ProductDetail, type DetailProduct } from "./product-detail";
import { FormationInfo, type CourseInfo } from "./formation-info";
import { PackInfoSection, type PackInfo } from "./pack-info";
import { PackHero } from "./pack-hero";
import { ProductCard, type ShopProduct } from "../product-card";
import { STORE, normLang } from "@/lib/store-i18n";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const supabase = await createClient();
  const { data } = await supabase.from("products").select("title").eq("slug", params.slug).maybeSingle();
  return { title: data?.title ? `${data.title} — Arazzo Boutique` : "Boutique — Arazzo" };
}

export default async function ProductPage({ params }: { params: { slug: string } }) {
  const supabase = await createClient();
  const lang = normLang((await cookies()).get("lang")?.value);
  const t = STORE[lang].shop;

  const { data: product } = await supabase
    .from("products")
    .select("id, title, description, type, price, compare_price, images, stock, slug, is_active, course_id, files")
    .eq("slug", params.slug)
    .eq("is_active", true)
    .maybeSingle();

  if (!product) notFound();

  // Si le produit est une formation, on récupère les détails « fiche formation »
  // (programme, ce qui est inclus, formatrice, avis) pour les afficher sous la fiche produit.
  let courseInfo: CourseInfo | null = null;
  if ((product as any).course_id) {
    const { data: course } = await supabase
      .from("courses")
      .select(`duree, niveau,
        formateur:users(nom, avatar_url, ville),
        chapters(id, titre, ordre, lessons(id, titre, duree_minutes, ordre, is_preview)),
        reviews(note, commentaire, user:users(nom))`)
      .eq("id", (product as any).course_id)
      .maybeSingle();
    courseInfo = (course as any) ?? null;
  }

  // Si le produit est un PACK (bundle), on détaille les formations incluses.
  let packInfo: PackInfo | null = null;
  let packGallery: string[] = [];
  let packReserveHref = "/offre#inscription";
  if (product.type === "bundle") {
    const ref = ((product as any).files as string[] | null ?? []).find((f) => f.startsWith("pack:"));
    const packId = ref ? ref.slice(5) : null;
    if (packId) {
      packReserveHref = `/offre?c=${packId}#inscription`;
      // Galerie propre au pack (carrousel) — lecture résiliente (colonne migration 092).
      const { data: gal } = await supabase.from("course_packs").select("gallery").eq("id", packId).maybeSingle();
      if (gal && Array.isArray((gal as any).gallery)) packGallery = ((gal as any).gallery as string[]).filter(Boolean);
      const { data: pack } = await supabase
        .from("course_packs")
        .select(`prix_dzd,
          items:course_pack_items(course:courses(id, slug, titre_fr, niveau, thumbnail, prix_dzd,
            course_categories(category:categories(name_fr)),
            chapters(id, titre, ordre, lessons(id, titre, ordre))))`)
        .eq("id", packId)
        .maybeSingle();
      if (pack) {
        const items = (pack.items as any[]) ?? [];

        // Image d'affichage propre par cours : la 1ʳᵉ photo de sa galerie (migration 090),
        // sinon sa miniature SI elle n'est pas une URL morte de l'ancien WordPress.
        // Évite les images brisées (thumbnail formation-arazzo.com) → repli icône propre.
        const courseIds = items.map((it) => it.course?.id).filter(Boolean) as string[];
        const galByCourse = new Map<string, string>();
        if (courseIds.length) {
          const { data: gals } = await supabase.from("courses").select("id, gallery").in("id", courseIds);
          for (const g of (gals as any[]) ?? []) {
            const first = Array.isArray(g.gallery) ? g.gallery.find((u: string) => typeof u === "string" && u) : null;
            if (first) galByCourse.set(g.id, first);
          }
        }
        const cleanImg = (id: string | undefined, thumb: string | null | undefined): string | null => {
          if (id && galByCourse.has(id)) return galByCourse.get(id)!;
          if (thumb && !thumb.includes("formation-arazzo.com")) return thumb;
          return null;
        };

        const catSet = new Set<string>();
        const courses = items.map((it) => {
          const c = it.course;
          const chapters = [...((c?.chapters as any[]) ?? [])].sort((a, b) => (a.ordre ?? 0) - (b.ordre ?? 0));
          for (const cc of (c?.course_categories as any[]) ?? []) {
            if (cc.category?.name_fr) catSet.add(cc.category.name_fr);
          }
          return {
            slug: c?.slug ?? null,
            title: c?.titre_fr ?? "Formation",
            niveau: c?.niveau ?? null,
            thumbnail: cleanImg(c?.id, c?.thumbnail),
            chapters: chapters.length,
            lessons: chapters.reduce((s: number, ch: any) => s + ((ch.lessons as any[])?.length ?? 0), 0),
            program: chapters.map((ch: any) => ({
              titre: (ch.titre as string) ?? "Chapitre",
              lessons: [...((ch.lessons as any[]) ?? [])]
                .sort((a: any, b: any) => (a.ordre ?? 0) - (b.ordre ?? 0))
                .map((l: any) => (l.titre as string) ?? "").filter(Boolean),
            })),
          };
        });
        packInfo = {
          packDzd: Number(pack.prix_dzd) || Number(product.price) || 0,
          totalDzd: items.reduce((s, it) => s + (Number(it.course?.prix_dzd) || 0), 0),
          categories: [...catSet],
          courses,
        };
      }
    }
  }

  // Produits similaires (même type)
  const { data: relatedRaw } = await supabase
    .from("products")
    .select("id, title, description, type, price, compare_price, images, stock, slug, is_active, course_id, files, course:courses(formateur:users(nom)), patron:patrons(formateur:users(nom))")
    .eq("is_active", true)
    .eq("type", product.type)
    .neq("id", product.id)
    .limit(4);
  const related = (relatedRaw ?? []).map((p: any) => ({
    ...p, creatorName: p.course?.formateur?.nom ?? p.patron?.formateur?.nom ?? null,
  }));

  return (
    <div className="min-h-[60vh]">
      <Link href="/boutique" className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-500 dark:text-white/60 hover:text-orange-600 dark:hover:text-orange-300 mb-6">
        <ChevronLeft size={16} className="rtl:rotate-180" /> {t.backToShop}
      </Link>

      {product.type === "bundle" && packInfo ? (
        <>
          {/* Formation (pack) : en-tête façon page cours + carrousel, puis cours inclus. */}
          <PackHero
            data={{
              title: product.title,
              description: product.description ?? null,
              gallery: packGallery,
              fallbackImages: packInfo.courses.map((c) => c.thumbnail).filter((x): x is string => !!x),
              formationsCount: packInfo.courses.length,
              lessonsCount: packInfo.courses.reduce((s, c) => s + (c.lessons ?? 0), 0),
              priceDzd: packInfo.packDzd,
              totalDzd: packInfo.totalDzd,
            }}
            reserveHref={packReserveHref}
            reserveLabel={t.reserve}
          />
          <PackInfoSection pack={packInfo} lang={lang} />
        </>
      ) : (
        <>
          <ProductDetail product={product as DetailProduct} lang={lang} />
          {courseInfo && <FormationInfo course={courseInfo} lang={lang} />}
          {packInfo && <PackInfoSection pack={packInfo} lang={lang} />}
        </>
      )}

      {!!related?.length && (
        <section className="mt-16">
          <h2 className="font-playfair text-2xl font-bold text-gray-900 dark:text-white mb-6">{t.related}</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            {related.map((p, i) => <ProductCard key={p.id} product={p as ShopProduct} index={i} lang={lang} />)}
          </div>
        </section>
      )}
    </div>
  );
}
