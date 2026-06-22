import Link from "next/link";
import { redirect } from "next/navigation";
import { PlusCircle, Pencil, Users, UserPlus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { aggregateEnrollments } from "@/lib/formateur-stats";

export const metadata = { title: "Mes cours — Formateur" };
export const dynamic = "force-dynamic";

export default async function FormateurCoursPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Espace formateur = SES propres cours + les cours importés non assignés (formateur_id NULL),
  // que le formateur peut reprendre et éditer. La lecture passe par le client ADMIN car la RLS
  // ne renverrait pas les cours non possédés. (La gestion globale reste dans /admin.)
  const admin = createAdminClient();
  const { data: courses } = await admin
    .from("courses")
    .select("id, titre_fr, published, created_at, thumbnail, formateur_id")
    .or(`formateur_id.eq.${user.id},formateur_id.is.null`)
    .order("created_at", { ascending: false });
  // Comptes d'inscrits par cours (paginé, sans la limite PostgREST de 1000 lignes).
  const courseIds = (courses ?? []).map((c) => c.id);
  const { byCourse } = await aggregateEnrollments(admin, courseIds);
  const countByCourse = new Map<string, number>([...byCourse].map(([id, m]) => [id, m.count]));

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-playfair text-3xl font-bold text-gray-900 dark:text-white">Mes cours</h1>
          <p className="text-gray-500 dark:text-white/50 mt-1 font-dm">{courses?.length ?? 0} cours.</p>
        </div>
        <Link href="/formateur/cours/nouveau"
          className="shiny-cta inline-flex items-center gap-2 bg-orange-DEFAULT text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-orange-600 transition-colors">
          <PlusCircle size={18} /> Nouveau cours
        </Link>
      </div>

      {!courses?.length ? (
        <div className="text-center py-20 bg-white dark:bg-white/[0.04] rounded-2xl border border-cream-200 dark:border-white/10">
          <div className="text-6xl mb-4">🎬</div>
          <p className="text-xl text-gray-400 mb-4">Vous n'avez pas encore créé de cours</p>
          <Link href="/formateur/cours/nouveau"
            className="inline-block bg-orange-DEFAULT text-white px-6 py-3 rounded-xl font-semibold hover:bg-orange-600 transition-colors">
            Créer mon premier cours
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {courses.map((c) => {
            const count = countByCourse.get(c.id) ?? 0;
            return (
              <div key={c.id} className="bg-white dark:bg-white/[0.04] rounded-2xl border border-cream-200 dark:border-white/10 overflow-hidden">
                <div className="aspect-video bg-cream-100 dark:bg-white/5 overflow-hidden">
                  {c.thumbnail ? (
                    <img src={c.thumbnail} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl">🧵</div>
                  )}
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-semibold text-gray-900 dark:text-white line-clamp-1">{c.titre_fr}</h3>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${
                        c.published ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                      }`}>
                        {c.published ? "● Publié" : "○ Brouillon"}
                      </span>
                      {c.formateur_id === null && (
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap bg-violet-100 text-violet-700">Importé</span>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 mb-3">
                    {new Date(c.created_at).toLocaleDateString("fr-FR")} · {count} inscrit(s)
                  </p>
                  {/* Inscription manuelle — bouton clair */}
                  <Link href={`/formateur/cours/${c.id}/inscrits`}
                    className="shiny-cta mb-3 w-full inline-flex items-center justify-center gap-2 bg-violet-700 text-white py-2 rounded-xl text-sm font-semibold hover:bg-violet-800 transition-colors">
                    <UserPlus size={15} /> Inscrire une élève
                  </Link>

                  <div className="flex items-center gap-2">
                    <Link href={`/formateur/cours/${c.id}/edit`}
                      className="inline-flex items-center gap-1.5 text-sm font-semibold text-orange-600 hover:underline">
                      <Pencil size={14} /> Modifier
                    </Link>
                    <span className="text-gray-300">·</span>
                    <Link href={`/formateur/cours/${c.id}/inscrits`}
                      className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-white/60 hover:text-orange-600">
                      <Users size={14} /> Inscrits
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
