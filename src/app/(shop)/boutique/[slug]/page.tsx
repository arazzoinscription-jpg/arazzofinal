import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ProductDetail, type DetailProduct } from "./product-detail";
import { FormationInfo, type CourseInfo } from "./formation-info";
import { PackInfoSection, type PackInfo } from "./pack-info";
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
  if (product.type === "bundle") {
    const ref = ((product as any).files as string[] | null ?? []).find((f) => f.startsWith("pack:"));
    const packId = ref ? ref.slice(5) : null;
    if (packId) {
      const { data: pack } = await supabase
        .from("course_packs")
        .select(`prix_dzd,
          items:course_pack_items(course:courses(slug, titre_fr, niveau, thumbnail, prix_dzd,
            course_categories(category:categories(name_fr)),
            chapters(id, lessons(id))))`)
        .eq("id", packId)
        .maybeSingle();
      if (pack) {
        const items = (pack.items as any[]) ?? [];
        const catSet = new Set<string>();
        const courses = items.map((it) => {
          const c = it.course;
          const chapters = (c?.chapters as any[]) ?? [];
          for (const cc of (c?.course_categories as any[]) ?? []) {
            if (cc.category?.name_fr) catSet.add(cc.category.name_fr);
          }
          return {
            slug: c?.slug ?? null,
            title: c?.titre_fr ?? "Formation",
            niveau: c?.niveau ?? null,
            thumbnail: c?.thumbnail ?? null,
            chapters: chapters.length,
            lessons: chapters.reduce((s: number, ch: any) => s + ((ch.lessons as any[])?.length ?? 0), 0),
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
    .select("id, title, description, type, price, compare_price, images, stock, slug, is_active, course:courses(formateur:users(nom)), patron:patrons(formateur:users(nom))")
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

      <ProductDetail product={product as DetailProduct} lang={lang} />

      {courseInfo && <FormationInfo course={courseInfo} lang={lang} />}

      {packInfo && <PackInfoSection pack={packInfo} lang={lang} />}

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
