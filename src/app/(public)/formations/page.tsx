import Link from "next/link";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { CourseCard } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Formations — Arazzo Formation",
  description: "Catalogue complet de formations en couture, broderie et modélisme.",
};

export default async function FormationsPage({
  searchParams,
}: {
  searchParams: { niveau?: string; q?: string; cat?: string };
}) {
  const supabase = await createClient();

  // Catégories (arborescence)
  type Cat = { id: string; parent_id: string | null; name_fr: string; slug: string; ordre: number };
  const { data: allCats } = await supabase
    .from("categories").select("id, parent_id, name_fr, slug, ordre").order("ordre", { ascending: true });
  const cats: Cat[] = (allCats as Cat[]) ?? [];
  const selectedCat = searchParams.cat ? cats.find((c) => c.slug === searchParams.cat) ?? null : null;
  const topCats = cats.filter((c) => !c.parent_id);
  const childrenOf = (id: string) => cats.filter((c) => c.parent_id === id);

  let query = supabase
    .from("courses")
    .select("*, formateur:users(nom)")
    .eq("published", true)
    .order("ordre", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (searchParams.niveau) query = query.eq("niveau", searchParams.niveau);
  if (searchParams.q) query = query.ilike("titre_fr", `%${searchParams.q}%`);

  // Filtre par catégorie (catégorie sélectionnée + toutes ses descendantes)
  if (selectedCat) {
    const descIds = new Set<string>([selectedCat.id]);
    let added = true;
    while (added) {
      added = false;
      for (const c of cats) {
        if (c.parent_id && descIds.has(c.parent_id) && !descIds.has(c.id)) { descIds.add(c.id); added = true; }
      }
    }
    const { data: cc } = await supabase.from("course_categories").select("course_id").in("category_id", [...descIds]);
    const courseIds = [...new Set((cc ?? []).map((r) => r.course_id))];
    query = courseIds.length ? query.in("id", courseIds) : query.eq("id", "00000000-0000-0000-0000-000000000000");
  }

  const { data: courses } = await query;

  const hrefFor = (slug: string | null) => {
    const p = new URLSearchParams();
    if (searchParams.q) p.set("q", searchParams.q);
    if (searchParams.niveau) p.set("niveau", searchParams.niveau);
    if (slug) p.set("cat", slug);
    const s = p.toString();
    return "/formations" + (s ? `?${s}` : "");
  };
  const subCats = selectedCat ? childrenOf(selectedCat.id) : [];

  const niveaux = [
    { value: "", label: "Tous les niveaux" },
    { value: "debutant", label: "Débutant" },
    { value: "intermediaire", label: "Intermédiaire" },
    { value: "avance", label: "Avancé" },
  ];

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-cream-DEFAULT">
        {/* Header */}
        <div className="bg-gradient-to-br from-violet-DEFAULT to-violet-700 pt-24 pb-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h1 className="font-playfair text-4xl lg:text-5xl font-bold text-white mb-4">
              Nos formations
            </h1>
            <p className="text-violet-200 text-xl mb-8">
              {courses?.length ?? 0} formations disponibles
            </p>

            {/* Search + filters */}
            <form className="flex flex-wrap gap-4">
              <input
                name="q"
                defaultValue={searchParams.q}
                placeholder="Rechercher une formation…"
                className="flex-1 min-w-56 px-5 py-3 rounded-xl bg-white/20 text-white placeholder-violet-200 border border-white/30 focus:outline-none focus:bg-white/30 transition-all"
              />
              <select
                name="niveau"
                defaultValue={searchParams.niveau}
                className="px-5 py-3 rounded-xl bg-white/20 text-white border border-white/30 focus:outline-none transition-all"
              >
                {niveaux.map((n) => (
                  <option key={n.value} value={n.value} className="text-gray-900">
                    {n.label}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="bg-orange-DEFAULT text-white px-6 py-3 rounded-xl font-semibold hover:bg-orange-600 transition-colors"
              >
                Filtrer
              </button>
            </form>
          </div>
        </div>

        {/* Navigation par catégorie */}
        {topCats.length > 0 && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
            <div className="flex flex-wrap gap-2">
              <Link href={hrefFor(null)}
                className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${!selectedCat ? "bg-orange-DEFAULT text-white" : "bg-white text-gray-600 border border-cream-200 hover:bg-cream-50"}`}>
                Toutes
              </Link>
              {topCats.map((c) => (
                <Link key={c.id} href={hrefFor(c.slug)}
                  className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${selectedCat?.id === c.id ? "bg-orange-DEFAULT text-white" : "bg-white text-gray-600 border border-cream-200 hover:bg-cream-50"}`}>
                  {c.name_fr}
                </Link>
              ))}
            </div>
            {subCats.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3 ps-1">
                {subCats.map((c) => (
                  <Link key={c.id} href={hrefFor(c.slug)}
                    className="px-3 py-1 rounded-lg text-xs font-medium bg-violet-50 text-violet-700 border border-violet-100 hover:bg-violet-100 transition-colors">
                    {c.name_fr}
                  </Link>
                ))}
              </div>
            )}
            {selectedCat && (
              <p className="text-sm text-gray-500 font-dm mt-3">Catégorie : <strong>{selectedCat.name_fr}</strong></p>
            )}
          </div>
        )}

        {/* Grid */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {!courses?.length ? (
            <div className="text-center py-20 text-gray-400">
              <div className="text-6xl mb-4">🔍</div>
              <p className="text-xl">Aucune formation trouvée</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {courses.map((course) => (
                <CourseCard
                  key={course.id}
                  title={course.titre_fr}
                  titleAr={course.titre_ar}
                  thumbnail={course.thumbnail}
                  prixDzd={course.prix_dzd}
                  prixEur={course.prix_eur}
                  formateur={(course.formateur as any)?.nom}
                  niveau={course.niveau}
                  duree={course.duree}
                  slug={course.slug}
                />
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
