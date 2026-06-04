import { createClient } from "@/lib/supabase/server";
import { SessionForm } from "./session-form";
import { DeleteSessionButton } from "./delete-button";

export const metadata = { title: "Sessions live — Arazzo Formation" };
export const dynamic = "force-dynamic";

export default async function FormateurSessionsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: courses } = await supabase
    .from("courses").select("id, titre_fr").eq("formateur_id", user!.id).order("titre_fr");

  const { data: sessions } = await supabase
    .from("live_sessions")
    .select("id, titre, starts_at, meet_url, replay_url, course:courses(titre_fr)")
    .eq("formateur_id", user!.id)
    .order("starts_at", { ascending: false });

  const now = Date.now();
  const upcoming = (sessions ?? []).filter((s) => new Date(s.starts_at).getTime() >= now);
  const past = (sessions ?? []).filter((s) => new Date(s.starts_at).getTime() < now);

  function fmt(iso: string) {
    return new Date(iso).toLocaleString("fr-FR", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <h1 className="font-playfair text-3xl font-bold text-gray-900">Sessions live</h1>
        <p className="text-gray-500 mt-1 font-dm">Planifiez vos directs Zoom/Meet. Les étudiantes sont prévenues automatiquement (J-1, H-1).</p>
      </div>

      <SessionForm courses={courses ?? []} />

      {/* À venir */}
      <h2 className="font-playfair text-xl font-bold text-gray-900 mt-10 mb-4">À venir ({upcoming.length})</h2>
      <div className="space-y-3">
        {upcoming.length === 0 ? (
          <p className="text-gray-400 font-dm text-sm">Aucune session planifiée.</p>
        ) : upcoming.map((s) => (
          <div key={s.id} className="bg-white rounded-2xl p-4 border border-cream-200 flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-orange-DEFAULT text-white flex flex-col items-center justify-center flex-shrink-0">
              <span className="text-lg">🎥</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-gray-900 font-dm">{s.titre}</div>
              <div className="text-sm text-gray-500 font-dm">📅 {fmt(s.starts_at)} · {(s.course as any)?.titre_fr ?? "Toutes"}</div>
              {s.meet_url && <a href={s.meet_url} target="_blank" rel="noopener noreferrer" className="text-xs text-orange-600 hover:underline">{s.meet_url}</a>}
            </div>
            <DeleteSessionButton id={s.id} />
          </div>
        ))}
      </div>

      {/* Passées */}
      <h2 className="font-playfair text-xl font-bold text-gray-900 mt-10 mb-4">Passées ({past.length})</h2>
      <div className="space-y-3">
        {past.length === 0 ? (
          <p className="text-gray-400 font-dm text-sm">Aucune session passée.</p>
        ) : past.map((s) => (
          <div key={s.id} className="bg-white rounded-2xl p-4 border border-cream-200 flex items-center gap-4 opacity-90">
            <div className="w-14 h-14 rounded-xl bg-cream-200 text-gray-500 flex items-center justify-center flex-shrink-0 text-lg">⏺</div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-gray-900 font-dm">{s.titre}</div>
              <div className="text-sm text-gray-500 font-dm">📅 {fmt(s.starts_at)}</div>
              {s.replay_url
                ? <a href={s.replay_url} target="_blank" rel="noopener noreferrer" className="text-xs text-green-600 font-semibold hover:underline">▶ Replay disponible</a>
                : <span className="text-xs text-gray-400">Pas de replay</span>}
            </div>
            <DeleteSessionButton id={s.id} />
          </div>
        ))}
      </div>
    </div>
  );
}
