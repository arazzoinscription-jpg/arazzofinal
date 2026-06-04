import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const metadata = { title: "Ma progression — Arazzo Formation" };
export const dynamic = "force-dynamic";

const DAY = 1000 * 60 * 60 * 24;

function fmtDuration(sec: number) {
  const h = Math.floor(sec / 3600);
  const m = Math.round((sec % 3600) / 60);
  if (h > 0) return `${h}h ${m}min`;
  return `${m}min`;
}

export default async function ProgressionPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Inscriptions + structure
  const { data: enrollments } = await supabase
    .from("enrollments")
    .select(`course:courses(id, titre_fr, thumbnail, chapters(lessons(id, duree_minutes)))`)
    .eq("user_id", user.id);

  const { data: progress } = await supabase
    .from("progress")
    .select("lesson_id, completed_at")
    .eq("user_id", user.id);

  const { data: vids } = await supabase
    .from("video_progress")
    .select("lesson_id, watched_pct, duration_sec, updated_at")
    .eq("user_id", user.id);

  const completed = new Set((progress ?? []).map((p) => p.lesson_id));

  // Temps passé par leçon (watched_pct × durée)
  const timeByLesson = new Map<string, number>();
  (vids ?? []).forEach((v) => {
    if (v.duration_sec) timeByLesson.set(v.lesson_id, ((v.watched_pct ?? 0) / 100) * v.duration_sec);
  });

  // Par cours
  type CourseRow = { id: string; titre: string; thumbnail: string | null; total: number; done: number; time: number };
  const rows: CourseRow[] = [];
  let totalLessons = 0, totalDone = 0, totalTime = 0;

  (enrollments ?? []).forEach((e) => {
    const c = e.course as any;
    if (!c) return;
    const lessons: { id: string; duree_minutes: number | null }[] =
      c.chapters?.flatMap((ch: any) => ch.lessons ?? []) ?? [];
    const total = lessons.length;
    const done = lessons.filter((l) => completed.has(l.id)).length;
    const time = lessons.reduce((acc, l) => acc + (timeByLesson.get(l.id) ?? 0), 0);
    rows.push({ id: c.id, titre: c.titre_fr, thumbnail: c.thumbnail, total, done, time });
    totalLessons += total; totalDone += done; totalTime += time;
  });
  rows.sort((a, b) => (b.done / (b.total || 1)) - (a.done / (a.total || 1)));

  const globalPct = totalLessons > 0 ? Math.round((totalDone / totalLessons) * 100) : 0;

  // ── Jours actifs (heatmap) ──
  const activity = new Map<string, number>();
  const addDay = (iso: string) => {
    const d = iso.slice(0, 10);
    activity.set(d, (activity.get(d) ?? 0) + 1);
  };
  (progress ?? []).forEach((p) => p.completed_at && addDay(p.completed_at));
  (vids ?? []).forEach((v) => v.updated_at && addDay(v.updated_at));

  const activeDays = activity.size;

  // Grille 18 semaines (126 jours), colonnes = semaines
  const WEEKS = 18;
  const today = new Date();
  const start = new Date(today.getTime() - (WEEKS * 7 - 1) * DAY);
  start.setDate(start.getDate() - start.getDay()); // aligner sur dimanche
  const cells: { date: string; count: number }[] = [];
  for (let i = 0; i < WEEKS * 7; i++) {
    const d = new Date(start.getTime() + i * DAY);
    const iso = d.toISOString().slice(0, 10);
    cells.push({ date: iso, count: activity.get(iso) ?? 0 });
  }
  const level = (n: number) => (n === 0 ? "bg-cream-200" : n < 2 ? "bg-violet-200" : n < 4 ? "bg-violet-400" : "bg-orange-DEFAULT");

  // ── Rythme + estimation ──
  const pace = activeDays > 0 ? totalDone / activeDays : 0; // leçons / jour actif
  const remaining = totalLessons - totalDone;
  const etaDays = pace > 0 ? Math.ceil(remaining / pace) : null;
  const etaDate = etaDays !== null
    ? new Date(today.getTime() + etaDays * DAY).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })
    : null;

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-playfair text-3xl font-bold text-gray-900">Ma progression</h1>
        <p className="text-gray-500 mt-1 font-dm">Votre avancement détaillé et votre rythme d'apprentissage.</p>
      </div>

      {/* Cartes synthèse */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { icon: "📊", label: "Progression globale", value: `${globalPct}%` },
          { icon: "✅", label: "Leçons complétées", value: `${totalDone}/${totalLessons}` },
          { icon: "⏱", label: "Temps d'apprentissage", value: fmtDuration(totalTime) },
          { icon: "📆", label: "Jours actifs", value: activeDays },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl p-5 border border-cream-200 shadow-soft">
            <div className="text-2xl mb-1">{s.icon}</div>
            <div className="text-2xl font-bold font-playfair text-orange-600">{s.value}</div>
            <div className="text-xs text-gray-500 font-dm mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Barre globale + estimation */}
      <div className="bg-white rounded-2xl p-6 border border-cream-200 shadow-soft mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="font-semibold text-gray-900 font-dm">Avancement global</span>
          <span className="font-bold text-orange-600">{globalPct}%</span>
        </div>
        <div className="h-3 bg-cream-200 rounded-full overflow-hidden mb-4">
          <div className="h-full bg-gradient-to-r from-violet-500 via-blush-400 to-orange-DEFAULT rounded-full transition-all" style={{ width: `${globalPct}%` }} />
        </div>
        {etaDate ? (
          <p className="text-sm text-gray-600 font-dm">
            À votre rythme actuel (~{pace.toFixed(1)} leçon/jour actif), il vous reste <strong>{remaining} leçons</strong> —
            fin estimée vers <strong className="text-orange-600">{etaDate}</strong>.
          </p>
        ) : (
          <p className="text-sm text-gray-400 font-dm">Complétez quelques leçons pour estimer votre date de fin.</p>
        )}
      </div>

      {/* Heatmap */}
      <div className="bg-white rounded-2xl p-6 border border-cream-200 shadow-soft mb-8">
        <h2 className="font-semibold text-gray-900 font-dm mb-4">Activité des 18 dernières semaines</h2>
        <div className="overflow-x-auto">
          <div className="grid grid-flow-col grid-rows-7 gap-1 w-max">
            {cells.map((c) => (
              <div key={c.date} title={`${c.date} · ${c.count} activité(s)`} className={`w-3 h-3 rounded-sm ${level(c.count)}`} />
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2 mt-3 text-xs text-gray-400 font-dm">
          Moins
          <span className="w-3 h-3 rounded-sm bg-cream-200 inline-block" />
          <span className="w-3 h-3 rounded-sm bg-violet-200 inline-block" />
          <span className="w-3 h-3 rounded-sm bg-violet-400 inline-block" />
          <span className="w-3 h-3 rounded-sm bg-orange-DEFAULT inline-block" />
          Plus
        </div>
      </div>

      {/* Par cours */}
      <h2 className="font-playfair text-xl font-bold text-gray-900 mb-4">Progression par formation</h2>
      <div className="space-y-3">
        {rows.length === 0 ? (
          <p className="text-gray-400 font-dm">Aucune formation pour le moment.</p>
        ) : (
          rows.map((r) => {
            const pct = r.total > 0 ? Math.round((r.done / r.total) * 100) : 0;
            return (
              <div key={r.id} className="bg-white rounded-2xl p-4 border border-cream-200 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-orange-100 overflow-hidden flex-shrink-0 flex items-center justify-center text-xl">
                  {r.thumbnail ? <img src={r.thumbnail} alt="" className="w-full h-full object-cover" /> : "🧵"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-3 mb-1">
                    <span className="font-medium text-gray-900 font-dm truncate">{r.titre}</span>
                    <span className="text-sm font-bold text-orange-600 flex-shrink-0">{pct}%</span>
                  </div>
                  <div className="h-1.5 bg-cream-200 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-violet-500 to-orange-DEFAULT rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="flex gap-4 mt-1 text-xs text-gray-400 font-dm">
                    <span>{r.done}/{r.total} leçons</span>
                    <span>⏱ {fmtDuration(r.time)}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
