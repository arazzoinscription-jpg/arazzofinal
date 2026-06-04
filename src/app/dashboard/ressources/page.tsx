import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const metadata = { title: "Ressources — Arazzo Formation" };
export const dynamic = "force-dynamic";

const ICON: Record<string, string> = { pdf: "📄", patron: "📐", zip: "🗜", video: "🎬", autre: "📎" };

export default async function StudentRessourcesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: enrolls } = await supabase
    .from("enrollments").select("course_id, course:courses(titre_fr)").eq("user_id", user.id);
  const courseIds = (enrolls ?? []).map((e) => e.course_id);
  const courseTitles = new Map<string, string>();
  (enrolls ?? []).forEach((e) => courseTitles.set(e.course_id, (e.course as any)?.titre_fr ?? ""));

  const { data: all } = await supabase
    .from("resources")
    .select("id, titre, type, taille_ko, course_id")
    .order("created_at", { ascending: false });

  const visible = (all ?? []).filter((r) => !r.course_id || courseIds.includes(r.course_id));

  // Grouper par formation (ou "Général")
  const groups = new Map<string, typeof visible>();
  visible.forEach((r) => {
    const key = r.course_id ? courseTitles.get(r.course_id) ?? "Formation" : "Ressources générales";
    const arr = groups.get(key) ?? [];
    arr.push(r);
    groups.set(key, arr);
  });

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-playfair text-3xl font-bold text-gray-900">Mes ressources</h1>
        <p className="text-gray-500 mt-1 font-dm">Patrons, PDF et bonus de vos formations, à télécharger.</p>
      </div>

      {groups.size === 0 ? (
        <div className="bg-white rounded-2xl p-10 border border-cream-200 text-center text-gray-400">
          <div className="text-5xl mb-3">📂</div>Aucune ressource disponible pour le moment.
        </div>
      ) : (
        <div className="space-y-8">
          {[...groups.entries()].map(([titre, items]) => (
            <div key={titre}>
              <h2 className="font-playfair text-lg font-bold text-gray-900 mb-3">{titre}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {items.map((r) => (
                  <a key={r.id} href={`/api/resources/${r.id}/download`}
                    className="bg-white rounded-2xl p-4 border border-cream-200 flex items-center gap-3 hover:shadow-lg hover:border-orange-200 transition-all group">
                    <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center text-xl flex-shrink-0">
                      {ICON[r.type] ?? "📎"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-900 font-dm truncate">{r.titre}</div>
                      <div className="text-xs text-gray-400 font-dm">
                        {r.type.toUpperCase()} · {r.taille_ko ? `${(r.taille_ko / 1024).toFixed(1)} Mo` : "—"}
                      </div>
                    </div>
                    <span className="text-orange-600 group-hover:translate-y-0.5 transition-transform flex-shrink-0">⬇</span>
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
