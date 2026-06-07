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
  searchParams: { niveau?: string; q?: string };
}) {
  const supabase = await createClient();
  let query = supabase
    .from("courses")
    .select("*, formateur:users(nom)")
    .eq("published", true)
    .order("ordre", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (searchParams.niveau) {
    query = query.eq("niveau", searchParams.niveau);
  }
  if (searchParams.q) {
    query = query.ilike("titre_fr", `%${searchParams.q}%`);
  }

  const { data: courses } = await query;

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
