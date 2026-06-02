import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const metadata = { title: "Annonces — Arazzo Formation" };
export const dynamic = "force-dynamic";

export default async function StudentAnnoncesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: enrolls } = await supabase.from("enrollments").select("course_id").eq("user_id", user.id);
  const courseIds = (enrolls ?? []).map((e) => e.course_id);

  const { data: all } = await supabase
    .from("announcements")
    .select("id, titre, body, created_at, course_id, course:courses(titre_fr)")
    .order("created_at", { ascending: false })
    .limit(50);

  const visible = (all ?? []).filter((a) => !a.course_id || courseIds.includes(a.course_id));

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <h1 className="font-playfair text-3xl font-bold text-gray-900">Annonces</h1>
        <p className="text-gray-500 mt-1 font-dm">Les nouvelles de vos formatrices.</p>
      </div>

      {visible.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 border border-cream-200 text-center text-gray-400">
          <div className="text-5xl mb-3">📭</div>Aucune annonce pour le moment.
        </div>
      ) : (
        <div className="space-y-4">
          {visible.map((a) => (
            <div key={a.id} className="bg-white rounded-2xl p-6 border border-cream-200 shadow-soft">
              <div className="flex items-start gap-3">
                <span className="text-2xl flex-shrink-0">📢</span>
                <div className="min-w-0">
                  <h3 className="font-playfair text-lg font-bold text-gray-900">{a.titre}</h3>
                  <p className="text-xs text-gray-400 font-dm mb-2">
                    {new Date(a.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                    {(a.course as any)?.titre_fr ? ` · ${(a.course as any).titre_fr}` : ""}
                  </p>
                  <p className="text-gray-700 font-dm whitespace-pre-line leading-relaxed">{a.body}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
