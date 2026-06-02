import { createClient } from "@/lib/supabase/server";
import { UploadForm } from "./upload-form";
import { DeleteResourceButton } from "./delete-button";

export const metadata = { title: "Ressources — Arazzo Formation" };
export const dynamic = "force-dynamic";

const ICON: Record<string, string> = { pdf: "📄", patron: "📐", zip: "🗜", video: "🎬", autre: "📎" };

export default async function FormateurRessourcesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: courses } = await supabase
    .from("courses").select("id, titre_fr").eq("formateur_id", user!.id).order("titre_fr");

  const { data: resources } = await supabase
    .from("resources")
    .select("id, titre, type, taille_ko, download_count, created_at, course:courses(titre_fr)")
    .eq("formateur_id", user!.id)
    .order("created_at", { ascending: false });

  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <h1 className="font-playfair text-3xl font-bold text-gray-900">Bibliothèque de ressources</h1>
        <p className="text-gray-500 mt-1 font-dm">Patrons, PDF, archives et vidéos bonus pour vos étudiantes.</p>
      </div>

      <UploadForm courses={courses ?? []} />

      <h2 className="font-playfair text-xl font-bold text-gray-900 mt-10 mb-4">
        Mes ressources ({resources?.length ?? 0})
      </h2>
      <div className="space-y-3">
        {!resources?.length ? (
          <p className="text-gray-400 font-dm text-sm">Aucune ressource pour le moment.</p>
        ) : resources.map((r) => (
          <div key={r.id} className="bg-white rounded-2xl p-4 border border-cream-200 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-cream-100 flex items-center justify-center text-xl flex-shrink-0">
              {ICON[r.type] ?? "📎"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-gray-900 font-dm truncate">{r.titre}</div>
              <div className="text-xs text-gray-400 font-dm">
                {(r.course as any)?.titre_fr ?? "Générale"} · {r.taille_ko ? `${(r.taille_ko / 1024).toFixed(1)} Mo` : "—"} · ⬇ {r.download_count} téléchargements
              </div>
            </div>
            <a href={`/api/resources/${r.id}/download`} className="text-violet-DEFAULT hover:underline text-sm font-semibold flex-shrink-0">Ouvrir</a>
            <DeleteResourceButton id={r.id} />
          </div>
        ))}
      </div>
    </div>
  );
}
