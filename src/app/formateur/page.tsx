import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Dashboard Formateur — Arazzo Formation" };

export default async function FormateurDashboard() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: courses } = await supabase
    .from("courses")
    .select(`
      id, titre_fr, description_fr, published, created_at, prix_dzd, prix_eur, thumbnail,
      enrollments(id, currency, amount)
    `)
    .eq("formateur_id", user!.id)
    .order("created_at", { ascending: false });

  const totalStudents = courses?.reduce(
    (acc, c) => acc + ((c.enrollments as any[])?.length ?? 0),
    0
  ) ?? 0;

  const totalRevDzd = courses?.reduce((acc, c) => {
    return (
      acc +
      ((c.enrollments as any[])
        ?.filter((e: any) => e.currency === "DZD")
        .reduce((s: number, e: any) => s + e.amount, 0) ?? 0)
    );
  }, 0) ?? 0;

  const totalRevEur = courses?.reduce((acc, c) => {
    return (
      acc +
      ((c.enrollments as any[])
        ?.filter((e: any) => e.currency === "EUR")
        .reduce((s: number, e: any) => s + e.amount, 0) ?? 0)
    );
  }, 0) ?? 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-playfair text-3xl font-bold text-gray-900">
          Tableau de bord
        </h1>
        <div className="flex items-center gap-3">
          <Link
            href="/formateur/packs/nouveau"
            className="border-2 border-violet-DEFAULT text-orange-600 px-5 py-2.5 rounded-xl font-semibold hover:bg-orange-50 transition-colors"
          >
            📦 Nouveau pack
          </Link>
          <Link
            href="/formateur/cours/nouveau"
            className="bg-orange-DEFAULT text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-orange-600 transition-colors"
          >
            ➕ Nouveau cours
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-10">
        {[
          { label: "Cours publiés", value: courses?.filter(c => c.published).length ?? 0, icon: "📚" },
          { label: "Élèves inscrits", value: totalStudents, icon: "👩‍🎓" },
          {
            label: "Revenus",
            value: `${totalRevDzd.toLocaleString("fr-DZ")} DA + ${totalRevEur.toFixed(0)}€`,
            icon: "💰",
            isText: true,
          },
        ].map((s) => (
          <div
            key={s.label}
            className="bg-white rounded-2xl p-6 border border-cream-200 flex items-center gap-4"
          >
            <span className="text-3xl">{s.icon}</span>
            <div>
              <div className={`font-bold font-playfair text-orange-600 ${s.isText ? "text-lg" : "text-3xl"}`}>
                {s.value}
              </div>
              <div className="text-sm text-gray-500">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Courses table */}
      <h2 className="font-playfair text-xl font-bold text-gray-900 mb-5">
        Mes cours
      </h2>

      {!courses?.length ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-cream-200">
          <div className="text-6xl mb-4">🎬</div>
          <p className="text-xl text-gray-400 mb-4">
            Vous n'avez pas encore créé de cours
          </p>
          <Link
            href="/formateur/cours/nouveau"
            className="inline-block bg-orange-DEFAULT text-white px-6 py-3 rounded-xl font-semibold hover:bg-orange-600 transition-colors"
          >
            Créer mon premier cours
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-cream-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-cream-50 border-b border-cream-200">
              <tr>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Cours</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Statut</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Élèves</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Créé le</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Revenus</th>
                <th className="px-6 py-4" />
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-100">
              {courses.map((course) => {
                const enrollments = course.enrollments as any[];
                const count = enrollments?.length ?? 0;
                const revDzd = enrollments
                  ?.filter((e) => e.currency === "DZD")
                  .reduce((s: number, e: any) => s + e.amount, 0) ?? 0;
                const revEur = enrollments
                  ?.filter((e) => e.currency === "EUR")
                  .reduce((s: number, e: any) => s + e.amount, 0) ?? 0;

                return (
                  <tr key={course.id} className="hover:bg-cream-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center text-xl overflow-hidden flex-shrink-0">
                          {course.thumbnail ? (
                            <img src={course.thumbnail} alt="" className="w-full h-full object-cover" />
                          ) : "🧵"}
                        </div>
                        <div className="min-w-0">
                          <span className="font-medium text-gray-900 line-clamp-1">
                            {course.titre_fr}
                          </span>
                          {course.description_fr && (
                            <p className="text-xs text-gray-400 line-clamp-1 max-w-xs">{course.description_fr}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${
                          course.published
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {course.published ? "● Publié" : "○ Brouillon"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-700 font-semibold">{count}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(course.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {revDzd > 0 && <div>{revDzd.toLocaleString("fr-DZ")} DA</div>}
                      {revEur > 0 && <div>{revEur.toFixed(0)} €</div>}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1.5">
                        <a
                          href={`/formateur/cours/${course.id}/edit`}
                          className="text-orange-600 font-semibold text-sm hover:underline"
                        >
                          Modifier
                        </a>
                        <a
                          href={`/formateur/cours/${course.id}/inscrits`}
                          className="text-gray-500 text-sm hover:text-orange-600 hover:underline"
                        >
                          Voir les inscrits
                        </a>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
