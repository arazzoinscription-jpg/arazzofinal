import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Mon espace — Arazzo Formation" };

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Gamification (système quiz/XP — alimenté par triggers)
  const { data: profile } = await supabase
    .from("users")
    .select("nom, ville, pays, xp_total, xp_this_month, level_label, current_streak, weekly_goal")
    .eq("id", user!.id)
    .single();

  const { data: allBadges } = await supabase
    .from("badges")
    .select("slug, name, description, icon, xp_reward")
    .not("slug", "is", null)
    .order("xp_reward", { ascending: true });

  const { data: myBadges } = await supabase
    .from("student_badges")
    .select("badge:badges(slug)")
    .eq("student_id", user!.id);
  const earnedCodes = new Set((myBadges ?? []).map((b) => (b.badge as { slug?: string })?.slug));

  const xpTotal = profile?.xp_total ?? 0;
  // Seuils des niveaux pour la barre de progression
  const tiers = [0, 200, 500, 1000, 2000, 4000];
  const nextTier = tiers.find((t) => t > xpTotal) ?? 4000;
  const prevTier = [...tiers].reverse().find((t) => t <= xpTotal) ?? 0;
  const tierPct = nextTier > prevTier ? Math.round(((xpTotal - prevTier) / (nextTier - prevTier)) * 100) : 100;

  const { data: enrollments } = await supabase
    .from("enrollments")
    .select(`
      *,
      course:courses(
        id, titre_fr, titre_ar, thumbnail, duree,
        chapters(lessons(id))
      )
    `)
    .eq("user_id", user!.id)
    .order("paid_at", { ascending: false });

  const { data: progressRecords } = await supabase
    .from("progress")
    .select("lesson_id")
    .eq("user_id", user!.id);

  const completedLessons = new Set(progressRecords?.map((p) => p.lesson_id));

  // Cours ayant du nouveau contenu (notifications new_content non lues)
  const { data: newContentNotifs } = await supabase
    .from("notifications")
    .select("course_id")
    .eq("user_id", user!.id)
    .eq("type", "new_content")
    .is("read_at", null);
  const coursesWithNew = new Set(
    (newContentNotifs ?? []).map((n) => n.course_id).filter(Boolean)
  );

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-playfair text-3xl font-bold text-gray-900">
          Bonjour, {profile?.nom?.split(" ")[0] ?? "!"} 👋
        </h1>
        <p className="text-gray-500 mt-1">
          {profile?.ville && profile?.pays
            ? `${profile.ville}, ${profile.pays}`
            : "Bienvenue sur Arazzo Formation"}
        </p>
      </div>

      {/* ── Gamification ── */}
      <div className="bg-gradient-to-br from-violet-600 to-violet-900 rounded-3xl p-6 mb-8 text-white shadow-xl overflow-hidden relative">
        <div className="absolute top-0 right-0 w-48 h-48 bg-orange-300/20 rounded-full -translate-y-1/3 translate-x-1/3 blur-2xl" />
        <div className="relative flex flex-col lg:flex-row lg:items-center gap-6">
          {/* Niveau + XP + série */}
          <div className="flex-shrink-0">
            <div className="flex items-center gap-4">
              <div className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-white/15 flex items-center justify-center text-2xl font-bold font-playfair">
                  🔥{profile?.current_streak ?? 0}
                </div>
                <div className="text-xs text-violet-100 mt-1.5 font-dm">Jours de suite</div>
              </div>
              <div>
                <div className="font-playfair text-2xl font-bold capitalize">{profile?.level_label ?? "apprentie"}</div>
                <div className="text-sm text-violet-100 font-dm">{xpTotal} XP · {profile?.xp_this_month ?? 0} ce mois</div>
                {/* Barre vers le niveau suivant */}
                <div className="mt-2 w-44 h-2 bg-white/15 rounded-full overflow-hidden">
                  <div className="h-full bg-orange-DEFAULT rounded-full" style={{ width: `${tierPct}%` }} />
                </div>
                <div className="text-[11px] text-violet-100 mt-1 font-dm">
                  {nextTier > xpTotal ? `${nextTier - xpTotal} XP avant le niveau suivant` : "Niveau max atteint 🎉"}
                </div>
              </div>
            </div>
          </div>
          {/* Badges */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-violet-100 font-dm">Mes badges ({earnedCodes.size}/{allBadges?.length ?? 0})</p>
              <a href="/dashboard/recompenses" className="text-xs text-orange-200 font-semibold hover:underline">Tout voir →</a>
            </div>
            <div className="flex flex-wrap gap-2">
              {(allBadges ?? []).map((b) => {
                const earned = earnedCodes.has(b.slug);
                return (
                  <div key={b.slug} title={`${b.name} — ${b.description}`}
                    className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl transition-all ${
                      earned ? "bg-white/20 ring-2 ring-orange-DEFAULT" : "bg-white/5 grayscale opacity-40"
                    }`}>
                    {b.icon}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-10">
        {[
          { icon: "📚", label: "Formations achetées", value: enrollments?.length ?? 0, chip: "bg-violet-50 text-violet-700", isText: false },
          { icon: "✅", label: "Leçons complétées", value: completedLessons.size, chip: "bg-orange-50 text-orange-600", isText: false },
          { icon: "🎓", label: "Certificats", value: "Voir l'onglet", chip: "bg-blush-50 text-blush-500", isText: true },
        ].map((s) => (
          <div
            key={s.label}
            className="bg-white rounded-2xl p-5 border border-cream-200 shadow-sm hover:shadow-md transition-shadow flex items-center gap-4"
          >
            <span className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${s.chip}`}>{s.icon}</span>
            <div>
              <div className={`font-bold font-playfair text-gray-900 ${s.isText ? "text-lg" : "text-3xl"}`}>
                {s.value}
              </div>
              <div className="text-sm text-gray-500 font-dm">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Courses */}
      <h2 className="font-playfair text-xl font-bold text-gray-900 mb-5">
        Mes formations
      </h2>

      {!enrollments?.length ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-cream-200">
          <div className="text-6xl mb-4">🧵</div>
          <p className="text-xl text-gray-400 mb-4">
            Vous n'avez pas encore de formation
          </p>
          <a
            href="/formations"
            className="inline-block bg-orange-DEFAULT text-white px-6 py-3 rounded-xl font-semibold hover:bg-orange-600 transition-colors"
          >
            Explorer le catalogue
          </a>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {enrollments.map((enrollment) => {
            const course = enrollment.course as any;
            const totalLessons = course?.chapters?.reduce(
              (acc: number, ch: any) => acc + (ch.lessons?.length ?? 0),
              0
            ) ?? 0;
            const allLessonIds: string[] = course?.chapters?.flatMap(
              (ch: any) => ch.lessons?.map((l: any) => l.id) ?? []
            ) ?? [];
            const done = allLessonIds.filter((id) => completedLessons.has(id)).length;
            const pct = totalLessons > 0 ? Math.round((done / totalLessons) * 100) : 0;

            return (
              <div
                key={enrollment.id}
                className="bg-white rounded-2xl border border-cream-200 overflow-hidden hover:shadow-lg transition-all"
              >
                <div className="flex">
                  <div className="w-28 h-28 bg-violet-50 flex-shrink-0 flex items-center justify-center text-4xl">
                    {course?.thumbnail ? (
                      <img
                        src={course.thumbnail}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      "🧵"
                    )}
                  </div>
                  <div className="p-5 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900 line-clamp-1">
                        {course?.titre_fr}
                      </h3>
                      {coursesWithNew.has(course?.id) && (
                        <span className="flex-shrink-0 inline-flex items-center gap-1 bg-orange-DEFAULT text-white text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse">
                          ✨ Nouveau
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between mb-2 text-sm">
                      <span className="text-gray-400">
                        {done}/{totalLessons} leçons
                      </span>
                      <span className="font-bold text-violet-700">{pct}%</span>
                    </div>
                    <div className="h-1.5 bg-cream-200 rounded-full overflow-hidden mb-3">
                      <div
                        className="h-full bg-gradient-to-r from-violet-500 to-orange-400 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <a
                      href={`/dashboard/cours/${allLessonIds[0] ?? course?.id}`}
                      className="inline-block bg-violet-DEFAULT text-white text-sm px-4 py-1.5 rounded-lg font-semibold hover:bg-violet-700 transition-colors"
                    >
                      {pct === 0 ? "Commencer" : pct === 100 ? "Revoir" : "Continuer"} →
                    </a>
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
