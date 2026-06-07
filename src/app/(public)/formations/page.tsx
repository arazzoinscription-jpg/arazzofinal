import Link from "next/link";
import { ChevronLeft, ArrowUpRight, FolderOpen } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { CourseCard } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

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

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-cream-DEFAULT dark:bg-[#0d0a1c]">
        {/* Header */}
        <div className="bg-gradient-to-br from-violet-DEFAULT to-violet-700 pt-24 pb-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Fil d'Ariane */}
            <nav className="flex flex-wrap items-center gap-1.5 text-sm text-violet-200 mb-3">
              <Link href="/formations" className="hover:text-white">Formations</Link>
              {crumbs.map((c) => (
                <span key={c.id} className="flex items-center gap-1.5">
                  <span className="opacity-50">›</span>
                  <Link href={hrefFor(c.slug)} className="hover:text-white">{c.name_fr}</Link>
                </span>
              ))}
            </nav>
            <h1 className="font-playfair text-4xl lg:text-5xl font-bold text-white mb-2">
              {selected ? selected.name_fr : "Nos formations"}
            </h1>
            <p className="text-violet-200 text-lg">
              {isLeaf ? `${courses.length} formation(s)` : `${children.length} catégorie(s)`}
            </p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {parentHref !== null && (
            <Link href={parentHref} className="inline-flex items-center gap-1.5 text-sm font-semibold text-orange-600 hover:underline mb-6">
              <ChevronLeft size={16} /> Retour
            </Link>
          )}

          {/* Niveau intermédiaire : cartes de (sous-)catégories */}
          {!isLeaf ? (
            children.length === 0 ? (
              <div className="text-center py-20 text-gray-400">Aucune catégorie.</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {children.map((c, i) => {
                  const sub = childrenOf(c.id).length;
                  const nb = courseCount(c.id);
                  return (
                    <Link key={c.id} href={hrefFor(c.slug)}
                      className="group relative rounded-3xl overflow-hidden border border-cream-200 dark:border-white/10 shadow-soft hover:shadow-glow transition-shadow h-48">
                      {c.image_url ? (
                        <img src={c.image_url} alt={c.name_fr} className="absolute inset-0 w-full h-full object-cover" />
                      ) : (
                        <div className={`absolute inset-0 bg-gradient-to-br ${GRAD[i % GRAD.length]}`} />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
                      <span className="absolute top-4 end-4 w-10 h-10 rounded-full bg-white/20 backdrop-blur flex items-center justify-center text-white group-hover:bg-white/30 transition-colors">
                        <ArrowUpRight size={18} />
                      </span>
                      <div className="absolute bottom-0 start-0 end-0 p-5 text-white">
                        <h3 className="font-playfair text-2xl font-bold leading-tight">{c.name_fr}</h3>
                        <p className="text-white/80 text-sm font-dm mt-1 flex items-center gap-1.5">
                          <FolderOpen size={14} />
                          {sub > 0 ? `${sub} sous-catégorie(s)` : `${nb} formation(s)`}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )
          ) : (
            /* Niveau feuille : les cours */
            courses.length === 0 ? (
              <div className="text-center py-20 text-gray-400">
                <div className="text-6xl mb-4">🧵</div>
                <p className="text-xl">Aucune formation dans cette catégorie pour l'instant.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {courses.map((course) => (
                  <CourseCard key={course.id} title={course.titre_fr} titleAr={course.titre_ar}
                    thumbnail={course.thumbnail} prixDzd={course.prix_dzd} prixEur={course.prix_eur}
                    formateur={(course.formateur as any)?.nom} niveau={course.niveau} duree={course.duree} slug={course.slug} />
                ))}
              </div>
            )
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
