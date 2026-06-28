import Link from "next/link";
import { cookies } from "next/headers";
import { ChevronLeft, Scissors, Layers3, PackageOpen } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { CourseCard } from "@/components/ui/card";
import { EnrollRequestButton } from "@/components/enrollment/enroll-request-button";
import { createClient } from "@/lib/supabase/server";
import { FormationsGuide } from "./formations-guide";
import { CategoryShowcase } from "./category-showcase";
import { FormationsHero } from "./formations-hero";
import { CategoryGrid, type CatItem } from "./category-grid";
import { FlickeringBackground } from "@/components/ui/flickering-bg";
import { STORE, normLang, isRtl } from "@/lib/store-i18n";

const HERO_TXT = {
  fr: { desc: "Du croquis à la pièce finie : modélisme, stylisme, artisanat. Apprenez un métier, à votre rythme.", cta: "Voir les catégories",
        feats: [{ title: "Cours vidéo HD", description: "Filmés en atelier, à votre rythme." }, { title: "Patrons inclus", description: "Des patrons prêts à imprimer." }, { title: "Certificat", description: "Une attestation de réussite." }] },
  ar: { desc: "من الرسم إلى القطعة المكتملة: موديلِزم، ستيليزم، حرف يدوية. تعلّمي حرفة على إيقاعك.", cta: "عرض الفئات",
        feats: [{ title: "دروس فيديو HD", description: "مصوّرة في الورشة، على إيقاعك." }, { title: "باترونات مرفقة", description: "باترونات جاهزة للطباعة." }, { title: "شهادة", description: "شهادة إتمام." }] },
  en: { desc: "From sketch to finished piece: patternmaking, styling, craft. Learn a trade, at your pace.", cta: "See the categories",
        feats: [{ title: "HD video lessons", description: "Filmed in the atelier, at your pace." }, { title: "Patterns included", description: "Print-ready patterns." }, { title: "Certificate", description: "A completion certificate." }] },
} as const;

export const metadata = {
  title: "Formations — Arazzo Formation",
  description: "Catalogue par catégories : couture, modélisme, stylisme, patronage…",
};
export const dynamic = "force-dynamic";

interface Cat { id: string; parent_id: string | null; name_fr: string; name_ar: string | null; slug: string; ordre: number; image_url: string | null }

const GRAD = [
  "from-violet-500 to-violet-700",
  "from-orange-400 to-orange-600",
  "from-blush-400 to-blush-500",
  "from-violet-600 to-orange-500",
  "from-teal-500 to-teal-700",
  "from-orange-500 to-blush-400",
  "from-violet-500 to-blush-500",
];

export default async function FormationsPage({ searchParams }: { searchParams: { cat?: string } }) {
  const supabase = await createClient();
  const lang = normLang((await cookies()).get("lang")?.value);
  const t = STORE[lang].formations;
  const rtl = isRtl(lang);
  const catName = (c: Cat) => (lang === "ar" ? c.name_ar || c.name_fr : c.name_fr);

  const { data: allCats } = await supabase
    .from("categories").select("id, parent_id, name_fr, name_ar, slug, ordre, image_url").order("ordre", { ascending: true });
  const cats: Cat[] = (allCats as Cat[]) ?? [];

  const selected = searchParams.cat ? cats.find((c) => c.slug === searchParams.cat) ?? null : null;
  const childrenOf = (id: string | null) => cats.filter((c) => c.parent_id === id).sort((a, b) => a.ordre - b.ordre);
  const children = childrenOf(selected?.id ?? null);
  const isLeaf = !!selected && children.length === 0;

  // Fil d'Ariane
  const crumbs: Cat[] = [];
  let cur = selected;
  while (cur) { crumbs.unshift(cur); cur = cur.parent_id ? cats.find((c) => c.id === cur!.parent_id) ?? null : null; }

  // Comptages pour les cartes
  const { data: ccAll } = await supabase.from("course_categories").select("course_id, category_id");
  const byCat = new Map<string, Set<string>>();
  for (const r of ccAll ?? []) {
    if (!byCat.has(r.category_id)) byCat.set(r.category_id, new Set());
    byCat.get(r.category_id)!.add(r.course_id);
  }
  const descendantsOf = (id: string): string[] => {
    const out = [id]; const stack = [id];
    while (stack.length) { const p = stack.pop()!; for (const c of cats) if (c.parent_id === p) { out.push(c.id); stack.push(c.id); } }
    return out;
  };
  const courseCount = (id: string) => {
    const ids = new Set<string>();
    for (const cid of descendantsOf(id)) (byCat.get(cid) ?? new Set()).forEach((x) => ids.add(x));
    return ids.size;
  };

  // Cours (uniquement au niveau feuille)
  let courses: any[] = [];
  if (isLeaf && selected) {
    const ids = [...(byCat.get(selected.id) ?? new Set<string>())];
    if (ids.length) {
      // La page Formations (catalogue) montre les cours PUBLIÉS (ligne « Publiée »).
      // La case « Inscription » (visible_inscription) ne contrôle QUE la page /offre,
      // pas l'affichage ici.
      const { data } = await supabase
        .from("courses").select("*, formateur:users(nom)")
        .eq("published", true).in("id", ids)
        .order("ordre", { ascending: true, nullsFirst: false }).order("created_at", { ascending: false });
      courses = data ?? [];
    }
  }

  const hrefFor = (slug: string | null) => (slug ? `/formations?cat=${slug}` : "/formations");
  const parentHref = selected
    ? hrefFor(selected.parent_id ? cats.find((c) => c.id === selected.parent_id)?.slug ?? null : null)
    : null;

  const ht = HERO_TXT[lang];

  // Données sérialisables pour la grille animée de catégories
  const catItems: CatItem[] = children.map((c, i) => {
    const sub = childrenOf(c.id).length;
    const nb = courseCount(c.id);
    return {
      id: c.id,
      href: hrefFor(c.slug),
      name: catName(c),
      image: c.image_url,
      gradient: GRAD[i % GRAD.length],
      isSub: sub > 0,
      count: sub > 0 ? sub : nb,
      metaLabel: sub > 0 ? t.nbSub(sub) : t.nbCourses(nb),
    };
  });
  // Catégories sœurs (navigation latérale en vue détaillée)
  const siblings = selected ? childrenOf(selected.parent_id) : [];

  return (
    <div dir={rtl ? "rtl" : "ltr"}>
      <Navbar lang={lang} solid />
      <main className="relative min-h-screen bg-cream-DEFAULT dark:bg-[#0d0a1c]">
        <FlickeringBackground />

        {/* Héro : carrousel 3D (vue racine) ou bandeau de catégorie (vue détaillée) */}
        {!selected ? (
          <FormationsHero title={t.allTitle} description={ht.desc} ctaText={ht.cta} features={[...ht.feats]} />
        ) : (
          <div className="relative overflow-hidden bg-cream-DEFAULT dark:bg-[#0b0818] pt-32 pb-12 border-b border-violet-950/10 dark:border-white/10">
            {/* Texture papier à patron */}
            <div aria-hidden className="absolute inset-0"
              style={{
                backgroundImage:
                  "linear-gradient(to right, rgba(91,22,249,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(91,22,249,0.04) 1px, transparent 1px)",
                backgroundSize: "27px 27px",
              }} />
            <div aria-hidden className="absolute -top-24 end-[8%] w-[30rem] h-[30rem] rounded-full bg-orange-400/15 dark:bg-orange-500/15 blur-3xl pointer-events-none" />
            <div aria-hidden className="absolute -bottom-32 start-[-6rem] w-[26rem] h-[26rem] rounded-full bg-blush-300/25 dark:bg-violet-700/20 blur-3xl pointer-events-none" />

            <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              {/* Chemin de classement (fil d'Ariane mono) */}
              <nav className="flex flex-wrap items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-violet-950/45 dark:text-white/40 mb-5">
                <span className="text-orange-600 dark:text-orange-400 tnum">N° {String((selected!.ordre ?? 0) + 1).padStart(2, "0")}</span>
                <span className="w-6 h-px bg-violet-950/20 dark:bg-white/20" />
                <Link href="/formations" className="hover:text-violet-950 dark:hover:text-white transition-colors">{t.crumbRoot}</Link>
                {crumbs.map((c) => (
                  <span key={c.id} className="flex items-center gap-2">
                    <span className="opacity-50">/</span>
                    <Link href={hrefFor(c.slug)} className="hover:text-violet-950 dark:hover:text-white transition-colors">{catName(c)}</Link>
                  </span>
                ))}
              </nav>

              <div className="flex flex-wrap items-end justify-between gap-6">
                <div className="min-w-0">
                  <h1 className="font-playfair text-4xl lg:text-[3.6rem] font-bold text-violet-950 dark:text-white leading-[1.05] tracking-tight max-w-3xl">
                    {catName(selected)}
                  </h1>
                  <p className="mt-3 font-mono text-xs uppercase tracking-[0.18em] text-violet-950/50 dark:text-white/45 tnum">
                    {isLeaf ? t.nbFormations(courses.length) : t.nbCategories(children.length)}
                  </p>
                </div>

                {/* Miniature encadrée de la catégorie */}
                {selected.image_url && (
                  <div aria-hidden className="relative rotate-[2deg] hidden sm:block">
                    <span className="absolute -top-2.5 -start-2.5 w-3.5 h-3.5 border-t-2 border-s-2 border-violet-950/25 dark:border-white/20" />
                    <span className="absolute -bottom-2.5 -end-2.5 w-3.5 h-3.5 border-b-2 border-e-2 border-violet-950/25 dark:border-white/20" />
                    <div className="rounded-2xl bg-cream-100 dark:bg-white/[0.05] p-2 ring-1 ring-violet-950/10 dark:ring-white/10 shadow-xl">
                      <div className="relative overflow-hidden rounded-xl w-28 h-28">
                        <img src={selected.image_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
                        <span className="absolute top-1.5 start-1.5 font-mono text-[9px] tracking-[0.2em] uppercase bg-orange-DEFAULT text-white px-1.5 py-0.5 rounded">N°</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Onglets : catégories sœurs */}
              {siblings.length > 1 && (
                <div className="mt-7 flex flex-wrap gap-2">
                  {siblings.map((c) => {
                    const on = c.id === selected!.id;
                    return (
                      <Link
                        key={c.id}
                        href={hrefFor(c.slug)}
                        aria-current={on ? "page" : undefined}
                        className={`inline-flex items-center rounded-xl px-4 py-1.5 text-sm font-semibold font-dm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${
                          on
                            ? "bg-violet-950 dark:bg-orange-DEFAULT text-white shadow-md"
                            : "bg-white dark:bg-white/[0.05] text-violet-950/70 dark:text-white/70 ring-1 ring-violet-950/12 dark:ring-white/10 hover:ring-orange-400 hover:text-orange-600 dark:hover:text-orange-300"
                        }`}
                      >
                        {catName(c)}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Sections par catégorie (vidéos) — vue racine uniquement */}
        {!selected && <CategoryShowcase />}

        <div id="formations-content" className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {parentHref !== null && (
            <Link href={parentHref} className="inline-flex items-center gap-1.5 text-sm font-semibold text-orange-600 hover:underline mb-6">
              <ChevronLeft size={16} className="rtl:rotate-180" /> {t.back}
            </Link>
          )}

          {/* Niveau intermédiaire : cartes de (sous-)catégories */}
          {!isLeaf ? (
            children.length === 0 ? (
              <div className="flex flex-col items-center text-center py-20 text-gray-400 dark:text-white/40">
                <PackageOpen size={48} strokeWidth={1.5} className="mb-4 text-cream-300 dark:text-white/20" />
                <p className="text-xl font-dm">{t.noCategory}</p>
              </div>
            ) : (
              <>
                <div className="mb-7">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-violet-DEFAULT/10 text-violet-700 dark:text-violet-300">
                      <Layers3 size={18} />
                    </span>
                    <h2 className="font-playfair text-2xl font-bold text-gray-900 dark:text-white">
                      {selected ? catName(selected) : t.allTitle}
                    </h2>
                    <span className="ms-auto font-mono text-[11px] uppercase tracking-[0.18em] text-violet-950/45 dark:text-white/40 tnum">
                      {t.nbCategories(children.length)}
                    </span>
                  </div>
                  <span aria-hidden className="mt-3 block border-t border-dashed border-violet-950/15 dark:border-white/15" />
                </div>
                <CategoryGrid items={catItems} />
              </>
            )
          ) : (
            /* Niveau feuille : les cours */
            courses.length === 0 ? (
              <div className="flex flex-col items-center text-center py-20 text-gray-400 dark:text-white/40">
                <Scissors size={48} strokeWidth={1.5} className="mb-4 text-cream-300 dark:text-white/20" />
                <p className="text-xl font-dm">{t.emptyLeaf}</p>
              </div>
            ) : (
              <>
                <div className="mb-7">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-orange-DEFAULT/10 text-orange-600 dark:text-orange-300">
                      <Scissors size={18} />
                    </span>
                    <h2 className="font-playfair text-2xl font-bold text-gray-900 dark:text-white">
                      {selected ? catName(selected) : t.allTitle}
                    </h2>
                    <span className="ms-auto font-mono text-[11px] uppercase tracking-[0.18em] text-violet-950/45 dark:text-white/40 tnum">
                      {t.nbFormations(courses.length)}
                    </span>
                  </div>
                  <span aria-hidden className="mt-3 block border-t border-dashed border-violet-950/15 dark:border-white/15" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {courses.map((course) => {
                    const cardTitle = lang === "ar" ? (course.titre_ar || course.titre_fr)
                      : lang === "en" ? (course.titre_en || course.titre_fr)
                      : course.titre_fr;
                    return (
                    <div key={course.id} className="flex flex-col gap-2">
                      <CourseCard title={cardTitle} titleAr={lang === "ar" ? undefined : course.titre_ar}
                        thumbnail={course.thumbnail} prixDzd={course.prix_dzd} prixEur={course.prix_eur}
                        formateur={(course.formateur as any)?.nom} niveau={course.niveau} duree={course.duree} slug={course.slug} />
                      <EnrollRequestButton courseId={course.id} courseTitle={cardTitle} variant="card" />
                    </div>
                    );
                  })}
                </div>
              </>
            )
          )}
        </div>

        {/* Guide d'inscription + utilisation + CTA (vue racine du catalogue) */}
        {!selected && <FormationsGuide lang={lang} />}
      </main>
      <Footer lang={lang} />
    </div>
  );
}
