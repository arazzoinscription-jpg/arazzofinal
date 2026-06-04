import { createClient } from "@/lib/supabase/server";
import { BookOpen, CheckCircle2, Flame, Sparkles, Trophy, CalendarClock, Target, ArrowRight } from "lucide-react";
import { WeeklyActivityChart, type DayDatum } from "@/components/dashboard/WeeklyActivityChart";

export const metadata = { title: "Mon espace — Arazzo Formation" };
export const dynamic = "force-dynamic";

const DAY = 86400000;
const WEEKDAY = ["D", "L", "M", "M", "J", "V", "S"];

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("users")
    .select("nom, xp_total, xp_this_month, level_label, current_streak, weekly_goal")
    .eq("id", user!.id)
    .single();

  const { data: allBadges } = await supabase
    .from("badges").select("slug, name, description, icon").not("slug", "is", null).order("xp_reward", { ascending: true });
  const { data: myBadges } = await supabase.from("student_badges").select("badge:badges(slug)").eq("student_id", user!.id);
  const earnedCodes = new Set((myBadges ?? []).map((b) => (b.badge as { slug?: string })?.slug));

  const xpTotal = profile?.xp_total ?? 0;
  const tiers = [0, 200, 500, 1000, 2000, 4000];
  const nextTier = tiers.find((t) => t > xpTotal) ?? 4000;
  const prevTier = [...tiers].reverse().find((t) => t <= xpTotal) ?? 0;
  const tierPct = nextTier > prevTier ? Math.round(((xpTotal - prevTier) / (nextTier - prevTier)) * 100) : 100;

  const { data: enrollments } = await supabase
    .from("enrollments")
    .select(`id, course:courses(id, titre_fr, thumbnail, chapters(lessons(id)))`)
    .eq("user_id", user!.id)
    .order("paid_at", { ascending: false });

  const { data: progressRecords } = await supabase
    .from("progress").select("lesson_id, completed_at").eq("user_id", user!.id);
  const completedLessons = new Set((progressRecords ?? []).map((p) => p.lesson_id));

  const { data: newContentNotifs } = await supabase
    .from("notifications").select("course_id").eq("user_id", user!.id).eq("type", "new_content").is("read_at", null);
  const coursesWithNew = new Set((newContentNotifs ?? []).map((n) => n.course_id).filter(Boolean));

  // Prochaine session live
  const { data: nextSessions } = await supabase
    .from("live_sessions")
    .select("titre, starts_at, meet_url, course:courses(titre_fr)")
    .gte("starts_at", new Date().toISOString())
    .order("starts_at", { ascending: true })
    .limit(1);
  const nextSession = nextSessions?.[0] as { titre?: string; starts_at?: string; course?: { titre_fr?: string } } | undefined;

  // Cours enrichis (progression)
  type CourseCard = { id: string; titre: string; thumbnail: string | null; total: number; done: number; pct: number; firstLesson: string | null; hasNew: boolean };
  const courses: CourseCard[] = (enrollments ?? []).map((e) => {
    const c = e.course as any;
    const lessons: { id: string }[] = c?.chapters?.flatMap((ch: any) => ch.lessons ?? []) ?? [];
    const total = lessons.length;
    const done = lessons.filter((l) => completedLessons.has(l.id)).length;
    const firstLesson = lessons.find((l) => !completedLessons.has(l.id))?.id ?? lessons[0]?.id ?? null;
    return { id: c?.id, titre: c?.titre_fr ?? "Formation", thumbnail: c?.thumbnail ?? null, total, done,
      pct: total > 0 ? Math.round((done / total) * 100) : 0, firstLesson, hasNew: coursesWithNew.has(c?.id) };
  });

  const totalLessons = courses.reduce((s, c) => s + c.total, 0);
  const totalDone = courses.reduce((s, c) => s + c.done, 0);
  const hero = courses.find((c) => c.pct < 100 && c.done > 0) ?? courses.find((c) => c.pct < 100) ?? courses[0];

  // Activité hebdomadaire (7 derniers jours)
  const today = new Date();
  const week: DayDatum[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today.getTime() - i * DAY);
    const key = d.toISOString().slice(0, 10);
    const count = (progressRecords ?? []).filter((p) => p.completed_at && p.completed_at.slice(0, 10) === key).length;
    week.push({ label: WEEKDAY[d.getDay()], count });
  }
  // Objectif hebdo (depuis lundi)
  const monday = new Date(today); const dow = (today.getDay() + 6) % 7;
  monday.setDate(today.getDate() - dow); monday.setHours(0, 0, 0, 0);
  const weekDone = (progressRecords ?? []).filter((p) => p.completed_at && new Date(p.completed_at) >= monday).length;
  const weekGoal = profile?.weekly_goal ?? 3;
  const goalPct = Math.min(100, Math.round((weekDone / Math.max(1, weekGoal)) * 100));

  const prenom = profile?.nom?.split(" ")[0] ?? "";
  const dateStr = today.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });

  const KPIS = [
    { icon: BookOpen, label: "Formations", value: courses.length, chip: "bg-violet-50 text-violet-700" },
    { icon: CheckCircle2, label: "Leçons faites", value: completedLessons.size, chip: "bg-green-50 text-green-600" },
    { icon: Sparkles, label: "XP total", value: xpTotal, chip: "bg-orange-50 text-orange-600" },
    { icon: Flame, label: "Série (jours)", value: profile?.current_streak ?? 0, chip: "bg-blush-50 text-blush-500" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
        <div>
          <h1 className="font-playfair text-3xl font-bold text-gray-900">Bonjour, {prenom} 👋</h1>
          <p className="text-gray-500 mt-1 capitalize font-dm">{dateStr}</p>
        </div>
        <a href="/formations" className="inline-flex items-center gap-1.5 bg-violet-DEFAULT text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-violet-700 transition-colors w-fit">
          Explorer le catalogue <ArrowRight size={16} />
        </a>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {KPIS.map((k) => {
          const Icon = k.icon;
          return (
            <div key={k.label} className="bg-white rounded-3xl p-5 shadow-sm border border-cream-200 hover:shadow-md transition-shadow">
              <span className={`w-11 h-11 rounded-2xl flex items-center justify-center ${k.chip}`}><Icon size={20} /></span>
              <div className="mt-3 text-3xl font-bold font-playfair text-gray-900">{k.value}</div>
              <div className="text-sm text-gray-500 font-dm">{k.label}</div>
            </div>
          );
        })}
      </div>

      {/* Rangée A : héro continuer + niveau */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Continuer l'apprentissage */}
        <div className="lg:col-span-2 bg-gradient-to-br from-violet-700 to-violet-900 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-56 h-56 bg-orange-400/20 rounded-full -translate-y-1/3 translate-x-1/4 blur-3xl" />
          <div className="relative">
            <p className="text-violet-200 text-sm font-dm mb-1">Continuer l'apprentissage</p>
            {hero ? (
              <>
                <h2 className="font-playfair text-2xl font-bold mb-4 line-clamp-1">{hero.titre}</h2>
                <div className="flex items-center gap-5">
                  <Ring pct={hero.pct} />
                  <div className="flex-1 min-w-0">
                    <p className="text-violet-100 text-sm font-dm">{hero.done}/{hero.total} leçons terminées</p>
                    <a href={`/dashboard/cours/${hero.firstLesson ?? hero.id}`}
                      className="inline-flex items-center gap-1.5 mt-3 bg-white text-violet-800 text-sm font-semibold px-4 py-2 rounded-xl hover:bg-violet-50 transition-colors">
                      {hero.pct === 0 ? "Commencer" : "Reprendre"} <ArrowRight size={16} />
                    </a>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-violet-100 font-dm mt-2">Aucune formation en cours. Explorez le catalogue pour commencer !</p>
            )}
          </div>
        </div>

        {/* Niveau / XP */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-cream-200 flex flex-col">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-9 h-9 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center"><Trophy size={18} /></span>
            <span className="font-semibold text-gray-900 font-dm">Mon niveau</span>
          </div>
          <p className="font-playfair text-2xl font-bold text-violet-700 capitalize">{profile?.level_label ?? "apprentie"}</p>
          <p className="text-sm text-gray-500 font-dm">{xpTotal} XP · {profile?.xp_this_month ?? 0} ce mois</p>
          <div className="mt-3 h-2.5 bg-cream-200 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-violet-500 to-orange-400 rounded-full" style={{ width: `${tierPct}%` }} />
          </div>
          <p className="text-xs text-gray-400 mt-1.5 font-dm">
            {nextTier > xpTotal ? `${nextTier - xpTotal} XP avant le niveau suivant` : "Niveau max 🎉"}
          </p>
        </div>
      </div>

      {/* Rangée B : activité + agenda/objectif */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 shadow-sm border border-cream-200">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="font-bold text-lg text-gray-900 font-dm">Activité de la semaine</h3>
              <p className="text-sm text-gray-400 font-dm">Leçons terminées par jour</p>
            </div>
            <span className="text-sm font-semibold text-violet-700">{totalDone}/{totalLessons} au total</span>
          </div>
          <WeeklyActivityChart data={week} />
        </div>

        <div className="space-y-4">
          {/* Prochaine session */}
          <div className="bg-[#1e0a3c] rounded-3xl p-5 text-white shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <CalendarClock size={18} className="text-orange-300" />
              <span className="font-semibold font-dm">Prochaine session</span>
            </div>
            {nextSession ? (
              <>
                <p className="font-semibold line-clamp-1">{nextSession.titre}</p>
                <p className="text-white/60 text-sm font-dm mt-0.5">
                  {nextSession.starts_at ? new Date(nextSession.starts_at).toLocaleString("fr-FR", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : ""}
                </p>
                <a href="/dashboard/sessions" className="inline-block mt-3 bg-white/10 hover:bg-white/20 text-sm font-semibold px-4 py-2 rounded-xl transition-colors">Voir l'agenda</a>
              </>
            ) : (
              <p className="text-white/60 text-sm font-dm">Aucune session programmée pour le moment.</p>
            )}
          </div>

          {/* Objectif hebdo */}
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-cream-200">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-9 h-9 rounded-xl bg-violet-50 text-violet-700 flex items-center justify-center"><Target size={18} /></span>
              <span className="font-semibold text-gray-900 font-dm">Objectif hebdo</span>
            </div>
            <p className="text-sm text-gray-500 font-dm mb-2">{weekDone}/{weekGoal} leçons cette semaine</p>
            <div className="h-2.5 bg-cream-200 rounded-full overflow-hidden">
              <div className="h-full bg-orange-DEFAULT rounded-full transition-all" style={{ width: `${goalPct}%` }} />
            </div>
            {goalPct >= 100 && <p className="text-xs text-green-600 font-semibold mt-1.5">Objectif atteint ! 🎉</p>}
          </div>
        </div>
      </div>

      {/* Badges */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-cream-200">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-lg text-gray-900 font-dm">Mes badges <span className="text-gray-400 font-normal text-sm">({earnedCodes.size}/{allBadges?.length ?? 0})</span></h3>
          <a href="/dashboard/recompenses" className="text-sm text-violet-700 font-semibold hover:underline">Tout voir →</a>
        </div>
        <div className="flex flex-wrap gap-2.5">
          {(allBadges ?? []).map((b) => {
            const earned = earnedCodes.has(b.slug);
            return (
              <div key={b.slug} title={`${b.name} — ${b.description}`}
                className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl transition-all ${
                  earned ? "bg-violet-50 ring-2 ring-orange-DEFAULT" : "bg-gray-50 grayscale opacity-40"}`}>
                {b.icon}
              </div>
            );
          })}
        </div>
      </div>

      {/* Mes formations */}
      <div>
        <h2 className="font-playfair text-xl font-bold text-gray-900 mb-4">Mes formations</h2>
        {courses.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-3xl border border-cream-200">
            <div className="text-6xl mb-4">🧵</div>
            <p className="text-xl text-gray-400 mb-4">Vous n'avez pas encore de formation</p>
            <a href="/formations" className="inline-block bg-orange-DEFAULT text-white px-6 py-3 rounded-xl font-semibold hover:bg-orange-600 transition-colors">Explorer le catalogue</a>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {courses.map((c) => (
              <div key={c.id} className="bg-white rounded-3xl border border-cream-200 overflow-hidden hover:shadow-lg transition-all flex">
                <div className="w-28 h-auto bg-violet-50 flex-shrink-0 flex items-center justify-center text-4xl">
                  {c.thumbnail ? <img src={c.thumbnail} alt="" className="w-full h-full object-cover" /> : "🧵"}
                </div>
                <div className="p-5 flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900 line-clamp-1">{c.titre}</h3>
                    {c.hasNew && <span className="flex-shrink-0 bg-orange-DEFAULT text-white text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse">✨ Nouveau</span>}
                  </div>
                  <div className="flex items-center justify-between mb-2 text-sm">
                    <span className="text-gray-400">{c.done}/{c.total} leçons</span>
                    <span className="font-bold text-violet-700">{c.pct}%</span>
                  </div>
                  <div className="h-1.5 bg-cream-200 rounded-full overflow-hidden mb-3">
                    <div className="h-full bg-gradient-to-r from-violet-500 to-orange-400 rounded-full transition-all" style={{ width: `${c.pct}%` }} />
                  </div>
                  <a href={`/dashboard/cours/${c.firstLesson ?? c.id}`}
                    className="inline-block bg-violet-DEFAULT text-white text-sm px-4 py-1.5 rounded-lg font-semibold hover:bg-violet-700 transition-colors">
                    {c.pct === 0 ? "Commencer" : c.pct === 100 ? "Revoir" : "Continuer"} →
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/** Anneau de progression (SVG) pour la carte héro. */
function Ring({ pct }: { pct: number }) {
  const R = 30, C = 2 * Math.PI * R;
  return (
    <div className="relative w-[76px] h-[76px] flex-shrink-0">
      <svg width="76" height="76" className="-rotate-90">
        <circle cx="38" cy="38" r={R} fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="7" />
        <circle cx="38" cy="38" r={R} fill="none" stroke="#F4801F" strokeWidth="7" strokeLinecap="round"
          strokeDasharray={C} strokeDashoffset={C - (C * pct) / 100} />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-white font-bold">{pct}%</span>
    </div>
  );
}
