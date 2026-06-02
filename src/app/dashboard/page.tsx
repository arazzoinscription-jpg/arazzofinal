import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Mon espace — Arazzo Formation" };

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Gamification : recalcul (badges/points/série) puis lecture
  await supabase.rpc("sync_gamification");

  const { data: profile } = await supabase
    .from("users")
    .select("nom, ville, pays, total_points, level")
    .eq("id", user!.id)
    .single();

  const { data: streak } = await supabase
    .from("learning_streaks")
    .select("current_streak")
    .eq("user_id", user!.id)
    .maybeSingle();

  const { data: allBadges } = await supabase
    .from("badges")
    .select("code, titre, description, icon, points")
    .order("points", { ascending: true });

  const { data: myBadges } = await supabase
    .from("user_badges")
    .select("badge:badges(code)")
    .eq("user_id", user!.id);
  const earnedCodes = new Set((myBadges ?? []).map((b) => (b.badge as { code?: string })?.code));

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
      <div className="bg-gradient-to-br from-violet-DEFAULT to-violet-800 rounded-3xl p-6 mb-8 text-white shadow-glow overflow-hidden relative">
        <div className="absolute top-0 right-0 w-48 h-48 bg-blush-300/15 rounded-full -translate-y-1/3 translate-x-1/3 blur-2xl" />
        <div className="relative flex flex-col md:flex-row md:items-center gap-6">
          {/* Niveau + points + série */}
          <div className="flex gap-6 flex-shrink-0">
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-white/15 flex items-center justify-center text-3xl font-bold font-playfair">
                {profile?.level ?? 1}
              </div>
              <div className="text-xs text-violet-200 mt-1.5 font-dm">Niveau</div>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-white/15 flex items-center justify-center text-2xl font-bold font-playfair">
                {profile?.total_points ?? 0}
              </div>
              <div className="text-xs text-violet-200 mt-1.5 font-dm">Points</div>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-white/15 flex items-center justify-center text-2xl font-bold font-playfair">
                🔥{streak?.current_streak ?? 0}
              </div>
              <div className="text-xs text-violet-200 mt-1.5 font-dm">Jours de suite</div>
            </div>
          </div>
          {/* Badges */}
          <div className="flex-1 min-w-0">
            <p className="text-sm text-violet-200 font-dm mb-2">
              Mes badges ({earnedCodes.size}/{allBadges?.length ?? 0})
            </p>
            <div className="flex flex-wrap gap-2">
              {(allBadges ?? []).map((b) => {
                const earned = earnedCodes.has(b.code);
                return (
                  <div
                    key={b.code}
                    title={`${b.titre} — ${b.description}`}
                    className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl transition-all ${
                      earned ? "bg-white/20 ring-2 ring-orange-DEFAULT" : "bg-white/5 grayscale opacity-40"
                    }`}
                  >
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
          { icon: "📚", label: "Formations achetées", value: enrollments?.length ?? 0 },
          { icon: "✅", label: "Leçons complétées", value: completedLessons.size },
          {
            icon: "🎓",
            label: "Certificats",
            value: "(voir onglet)",
            isText: true,
          },
        ].map((s) => (
          <div
            key={s.label}
            className="bg-white rounded-2xl p-6 border border-cream-200 flex items-center gap-4"
          >
            <span className="text-3xl">{s.icon}</span>
            <div>
              <div className="text-2xl font-bold font-playfair text-violet-DEFAULT">
                {s.value}
              </div>
              <div className="text-sm text-gray-500">{s.label}</div>
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
                  <div className="w-28 h-28 bg-violet-100 flex-shrink-0 flex items-center justify-center text-4xl">
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
                      <span className="font-bold text-violet-DEFAULT">{pct}%</span>
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
