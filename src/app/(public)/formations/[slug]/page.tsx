import { notFound } from "next/navigation";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { createPublicClient } from "@/lib/supabase/public";
import { BuyButton } from "./buy-button";

// ISR : fiches cours pré-rendues + revalidées toutes les 5 minutes
export const revalidate = 300;

export async function generateStaticParams() {
  const supabase = createPublicClient();
  const { data } = await supabase.from("courses").select("slug").eq("published", true);
  return (data ?? []).map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}) {
  const supabase = createPublicClient();
  const { data } = await supabase
    .from("courses")
    .select("titre_fr, description_fr")
    .eq("slug", params.slug)
    .single();

  return {
    title: data ? `${data.titre_fr} — Arazzo Formation` : "Formation",
    description: data?.description_fr,
  };
}

export default async function CourseDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  const supabase = createPublicClient();

  const { data: course } = await supabase
    .from("courses")
    .select(
      `*,
      formateur:users(nom, avatar_url, ville),
      chapters(*, lessons(id, titre, duree_minutes, ordre, is_preview)),
      reviews(note, commentaire, created_at, user:users(nom))`
    )
    .eq("slug", params.slug)
    .eq("published", true)
    .single();

  if (!course) notFound();

  const totalLessons = (course.chapters as any[])?.reduce(
    (acc: number, c: any) => acc + (c.lessons?.length ?? 0),
    0
  );
  const avgRating =
    (course.reviews as any[])?.length
      ? (course.reviews as any[]).reduce(
          (s: number, r: any) => s + r.note,
          0
        ) / (course.reviews as any[]).length
      : null;

  const formateur = course.formateur as any;

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-cream-DEFAULT">
        {/* Header banner */}
        <div className="bg-gradient-to-br from-violet-DEFAULT to-violet-700 pt-24 pb-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
              <div className="lg:col-span-2">
                <div className="inline-block bg-white/20 text-white text-sm px-3 py-1 rounded-full mb-4 capitalize">
                  {course.niveau}
                </div>
                <h1 className="font-playfair text-3xl lg:text-4xl font-bold text-white mb-3">
                  {course.titre_fr}
                </h1>
                {course.titre_ar && (
                  <p className="text-violet-200 text-xl font-arabic text-right mb-4" dir="rtl">
                    {course.titre_ar}
                  </p>
                )}
                <div className="flex flex-wrap gap-5 text-violet-200 text-sm">
                  {avgRating && (
                    <span>⭐ {avgRating.toFixed(1)} ({(course.reviews as any[]).length} avis)</span>
                  )}
                  <span>⏱ {course.duree}</span>
                  <span>📚 {totalLessons} leçons</span>
                  {formateur?.nom && <span>par {formateur.nom}</span>}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            {/* Left — content */}
            <div className="lg:col-span-2 space-y-8">
              {/* Description */}
              <div className="bg-white rounded-2xl p-8 border border-cream-200">
                <h2 className="font-playfair text-2xl font-bold text-gray-900 mb-4">
                  À propos de cette formation
                </h2>
                <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                  {course.description_fr}
                </p>
              </div>

              {/* Curriculum */}
              <div className="bg-white rounded-2xl p-8 border border-cream-200">
                <h2 className="font-playfair text-2xl font-bold text-gray-900 mb-6">
                  Programme
                </h2>
                <div className="space-y-4">
                  {(course.chapters as any[])
                    ?.sort((a: any, b: any) => a.ordre - b.ordre)
                    .map((chapter: any) => (
                      <details key={chapter.id} className="group">
                        <summary className="flex items-center justify-between cursor-pointer py-3 px-4 bg-cream-50 rounded-xl hover:bg-cream-100 transition-colors font-semibold text-gray-800">
                          <span>{chapter.titre}</span>
                          <span className="text-sm text-gray-400">
                            {chapter.lessons?.length} leçons
                          </span>
                        </summary>
                        <div className="mt-2 ml-4 space-y-1">
                          {(chapter.lessons as any[])
                            ?.sort((a: any, b: any) => a.ordre - b.ordre)
                            .map((lesson: any) => (
                              <div
                                key={lesson.id}
                                className="flex items-center justify-between py-2 px-4 text-sm text-gray-600"
                              >
                                <span>
                                  {lesson.is_preview ? "🔓" : "🔒"} {lesson.titre}
                                </span>
                                {lesson.duree_minutes && (
                                  <span className="text-gray-400">
                                    {lesson.duree_minutes} min
                                  </span>
                                )}
                              </div>
                            ))}
                        </div>
                      </details>
                    ))}
                </div>
              </div>

              {/* Reviews */}
              {(course.reviews as any[])?.length > 0 && (
                <div className="bg-white rounded-2xl p-8 border border-cream-200">
                  <h2 className="font-playfair text-2xl font-bold text-gray-900 mb-6">
                    Avis des élèves
                  </h2>
                  <div className="space-y-4">
                    {(course.reviews as any[]).slice(0, 5).map((review: any, i: number) => (
                      <div key={i} className="border-b border-cream-200 pb-4 last:border-0">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-sm font-bold text-orange-600">
                            {review.user?.nom?.[0] ?? "?"}
                          </div>
                          <div>
                            <div className="font-semibold text-sm text-gray-800">
                              {review.user?.nom ?? "Élève"}
                            </div>
                            <div className="text-orange-DEFAULT text-sm">
                              {"★".repeat(review.note)}
                            </div>
                          </div>
                        </div>
                        <p className="text-gray-600 text-sm">{review.commentaire}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right — purchase card (sticky) */}
            <div className="lg:sticky lg:top-6 h-fit">
              <div className="bg-white rounded-2xl shadow-xl border border-cream-200 overflow-hidden">
                {course.thumbnail && (
                  <img
                    src={course.thumbnail}
                    alt={course.titre_fr}
                    className="w-full aspect-video object-cover"
                  />
                )}
                <div className="p-6">
                  <div className="flex items-baseline gap-3 mb-2">
                    <span className="text-3xl font-bold text-orange-DEFAULT">
                      {course.prix_dzd.toLocaleString("fr-DZ")} DA
                    </span>
                    <span className="text-gray-400">/ {course.prix_eur}€</span>
                  </div>

                  <BuyButton
                    courseId={course.id}
                    courseTitre={course.titre_fr}
                    prixDzd={course.prix_dzd}
                    prixEur={course.prix_eur}
                    firstLessonId={
                      (course.chapters as any[])?.[0]?.lessons?.[0]?.id
                    }
                  />

                  <ul className="mt-5 space-y-2 text-sm text-gray-600">
                    <li className="flex items-center gap-2">
                      <span className="text-orange-600">✓</span>
                      Accès à vie
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-orange-600">✓</span>
                      Certificat de réussite
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-orange-600">✓</span>
                      Patrons PDF inclus
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-orange-600">✓</span>
                      {totalLessons} leçons vidéo HD
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
