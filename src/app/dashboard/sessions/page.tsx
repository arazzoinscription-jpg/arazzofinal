import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const metadata = { title: "Sessions live — Arazzo Formation" };
export const dynamic = "force-dynamic";

export default async function StudentSessionsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Cours suivis
  const { data: enrolls } = await supabase.from("enrollments").select("course_id").eq("user_id", user.id);
  const courseIds = (enrolls ?? []).map((e) => e.course_id);

  // Sessions : globales (course_id null) OU des cours suivis
  const { data: all } = await supabase
    .from("live_sessions")
    .select("id, titre, description, starts_at, meet_url, replay_url, course_id, course:courses(titre_fr)")
    .order("starts_at", { ascending: true });

  const visible = (all ?? []).filter((s) => !s.course_id || courseIds.includes(s.course_id));
  const now = Date.now();
  const upcoming = visible.filter((s) => new Date(s.starts_at).getTime() >= now - 2 * 3600 * 1000);
  const past = visible.filter((s) => new Date(s.starts_at).getTime() < now - 2 * 3600 * 1000).reverse();

  function fmt(iso: string) {
    return new Date(iso).toLocaleString("fr-FR", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
  }
  function countdown(iso: string) {
    const diff = new Date(iso).getTime() - now;
    if (diff < 0) return "En cours / passée";
    const d = Math.floor(diff / 86400000), h = Math.floor((diff % 86400000) / 3600000);
    if (d > 0) return `Dans ${d}j ${h}h`;
    return `Dans ${h}h`;
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-playfair text-3xl font-bold text-gray-900">Sessions live</h1>
        <p className="text-gray-500 mt-1 font-dm">Vos ateliers en direct et les rediffusions.</p>
      </div>

      {/* À venir */}
      <h2 className="font-playfair text-xl font-bold text-gray-900 mb-4">🔴 À venir</h2>
      <div className="space-y-3 mb-10">
        {upcoming.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 border border-cream-200 text-center text-gray-400">
            <div className="text-4xl mb-2">📅</div>Aucune session programmée pour le moment.
          </div>
        ) : upcoming.map((s) => (
          <div key={s.id} className="bg-gradient-to-r from-violet-50 to-white rounded-2xl p-5 border border-orange-200">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="min-w-0">
                <span className="inline-block bg-orange-DEFAULT text-white text-xs font-bold px-2.5 py-0.5 rounded-full mb-2">
                  {countdown(s.starts_at)}
                </span>
                <h3 className="font-playfair text-lg font-bold text-gray-900">{s.titre}</h3>
                <p className="text-sm text-gray-500 font-dm capitalize">📅 {fmt(s.starts_at)}</p>
                {s.description && <p className="text-sm text-gray-600 font-dm mt-1">{s.description}</p>}
              </div>
              {s.meet_url && (
                <a href={s.meet_url} target="_blank" rel="noopener noreferrer"
                  className="bg-orange-DEFAULT text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-orange-600 transition-colors flex-shrink-0">
                  Rejoindre →
                </a>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Replays */}
      <h2 className="font-playfair text-xl font-bold text-gray-900 mb-4">▶ Rediffusions</h2>
      <div className="space-y-3">
        {past.filter((s) => s.replay_url).length === 0 ? (
          <p className="text-gray-400 font-dm text-sm">Aucune rediffusion disponible.</p>
        ) : past.filter((s) => s.replay_url).map((s) => (
          <div key={s.id} className="bg-white rounded-2xl p-4 border border-cream-200 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-cream-200 flex items-center justify-center text-lg flex-shrink-0">▶</div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-gray-900 font-dm">{s.titre}</div>
              <div className="text-xs text-gray-400 font-dm">{fmt(s.starts_at)}</div>
            </div>
            <a href={s.replay_url!} target="_blank" rel="noopener noreferrer"
              className="bg-green-100 text-green-700 px-4 py-2 rounded-xl font-semibold text-sm hover:bg-green-200 transition-colors flex-shrink-0">
              Voir le replay
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
