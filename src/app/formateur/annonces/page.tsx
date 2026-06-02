import { createClient } from "@/lib/supabase/server";
import { AnnounceForm } from "./announce-form";

export const metadata = { title: "Annonces — Arazzo Formation" };
export const dynamic = "force-dynamic";

export default async function FormateurAnnoncesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: courses } = await supabase
    .from("courses").select("id, titre_fr").eq("formateur_id", user!.id).order("titre_fr");

  const { data: announcements } = await supabase
    .from("announcements")
    .select("id, titre, body, created_at, course:courses(titre_fr)")
    .eq("author_id", user!.id)
    .order("created_at", { ascending: false })
    .limit(30);

  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <h1 className="font-playfair text-3xl font-bold text-gray-900">Centre d'annonces</h1>
        <p className="text-gray-500 mt-1 font-dm">Communiquez avec vos étudiantes : dashboard, email et temps réel.</p>
      </div>

      <AnnounceForm courses={courses ?? []} />

      <h2 className="font-playfair text-xl font-bold text-gray-900 mt-10 mb-4">Historique ({announcements?.length ?? 0})</h2>
      <div className="space-y-3">
        {!announcements?.length ? (
          <p className="text-gray-400 font-dm text-sm">Aucune annonce envoyée.</p>
        ) : announcements.map((a) => (
          <div key={a.id} className="bg-white rounded-2xl p-5 border border-cream-200">
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-semibold text-gray-900 font-dm">📢 {a.titre}</h3>
              <span className="text-xs text-gray-400 flex-shrink-0 font-dm">
                {new Date(a.created_at).toLocaleDateString("fr-FR")}
              </span>
            </div>
            <p className="text-sm text-gray-600 font-dm mt-1">{a.body}</p>
            <span className="inline-block mt-2 text-xs bg-violet-50 text-violet-DEFAULT px-2.5 py-0.5 rounded-full font-dm">
              {(a.course as any)?.titre_fr ? `Inscrites : ${(a.course as any).titre_fr}` : "Toutes les étudiantes"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
