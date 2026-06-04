import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata = { title: "Statistiques avancées — Arazzo Formation" };
export const dynamic = "force-dynamic";

const DAY = 1000 * 60 * 60 * 24;

export default async function AnalyticsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const admin = createAdminClient();
  const now = Date.now();

  // Cours du formateur + structure
  const { data: courses } = await admin
    .from("courses")
    .select("id, titre_fr, chapters(lessons(id, titre))")
    .eq("formateur_id", user!.id);

  const courseIds = (courses ?? []).map((c) => c.id);
  const lessonToCourse = new Map<string, string>();
  const lessonTitle = new Map<string, string>();
  const courseLessons = new Map<string, string[]>();
  (courses ?? []).forEach((c) => {
    const ls: string[] = [];
    (c.chapters as any[])?.forEach((ch) => (ch.lessons as any[])?.forEach((l) => {
      lessonToCourse.set(l.id, c.id); lessonTitle.set(l.id, l.titre); ls.push(l.id);
    }));
    courseLessons.set(c.id, ls);
  });

  // Inscriptions
  const { data: enrolls } = await admin
    .from("enrollments").select("user_id, course_id")
    .in("course_id", courseIds.length ? courseIds : ["00000000-0000-0000-0000-000000000000"]);
  const enrollByCourse = new Map<string, Set<string>>();
  const allStudents = new Set<string>();
  (enrolls ?? []).forEach((e) => {
    allStudents.add(e.user_id);
    const set = enrollByCourse.get(e.course_id) ?? new Set<string>();
    set.add(e.user_id); enrollByCourse.set(e.course_id, set);
  });

  // Progression (leçons complétées)
  const { data: progress } = await admin.from("progress").select("user_id, lesson_id, completed_at");
  const doneByUser = new Map<string, Set<string>>();
  const activeUsers = new Set<string>();
  (progress ?? []).forEach((p) => {
    if (!lessonToCourse.has(p.lesson_id)) return;
    const set = doneByUser.get(p.user_id) ?? new Set<string>();
    set.add(p.lesson_id); doneByUser.set(p.user_id, set);
    if (p.completed_at && now - new Date(p.completed_at).getTime() < 14 * DAY) activeUsers.add(p.user_id);
  });

  // Stats vidéos
  const { data: vids } = await admin.from("video_progress").select("lesson_id, user_id, watched_pct, duration_sec, updated_at");
  const vidStats = new Map<string, { views: number; sumPct: number }>();
  let totalWatchSec = 0;
  (vids ?? []).forEach((v) => {
    if (!lessonToCourse.has(v.lesson_id)) return;
    const st = vidStats.get(v.lesson_id) ?? { views: 0, sumPct: 0 };
    st.views++; st.sumPct += v.watched_pct ?? 0; vidStats.set(v.lesson_id, st);
    totalWatchSec += ((v.watched_pct ?? 0) / 100) * (v.duration_sec ?? 0);
    if (v.updated_at && now - new Date(v.updated_at).getTime() < 14 * DAY) activeUsers.add(v.user_id);
  });

  // ── KPI ──
  const totalStudents = allStudents.size;
  const active = [...activeUsers].filter((u) => allStudents.has(u)).length;
  const inactive = totalStudents - active;

  // Complétion / abandon par cours
  const courseStats = (courses ?? []).map((c) => {
    const lessons = courseLessons.get(c.id) ?? [];
    const students = [...(enrollByCourse.get(c.id) ?? [])];
    let finishers = 0, started = 0;
    students.forEach((u) => {
      const done = lessons.filter((lid) => doneByUser.get(u)?.has(lid)).length;
      if (done > 0) started++;
      if (lessons.length > 0 && done === lessons.length) finishers++;
    });
    return {
      id: c.id, titre: c.titre_fr, enrolled: students.length,
      completion: students.length ? Math.round((finishers / students.length) * 100) : 0,
      abandon: students.length ? Math.round(((students.length - started) / students.length) * 100) : 0,
    };
  });
  const avgCompletion = courseStats.length
    ? Math.round(courseStats.reduce((a, c) => a + c.completion, 0) / courseStats.length) : 0;
  const popular = [...courseStats].sort((a, b) => b.enrolled - a.enrolled).slice(0, 6);

  // Vidéos +/- vues
  const vidRows = [...vidStats.entries()].map(([lid, st]) => ({
    titre: lessonTitle.get(lid) ?? "?", views: st.views, avgPct: Math.round(st.sumPct / st.views),
  }));
  const mostViewed = [...vidRows].sort((a, b) => b.views - a.views).slice(0, 5);
  const leastViewed = [...vidRows].sort((a, b) => a.views - b.views).slice(0, 5);

  const avgTimePerStudent = totalStudents ? Math.round(totalWatchSec / totalStudents / 60) : 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
        <div>
          <h1 className="font-playfair text-3xl font-bold text-gray-900">Statistiques avancées</h1>
          <p className="text-gray-500 mt-1 font-dm">Vue complète de l'engagement de vos étudiantes.</p>
        </div>
        <Link href="/formateur/etudiantes-inactives" className="bg-white border border-cream-200 text-orange-600 font-semibold px-4 py-2 rounded-xl hover:bg-orange-50 transition-colors text-sm">
          😴 Voir les inactives →
        </Link>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {[
          { icon: "👩‍🎓", label: "Étudiantes", value: totalStudents },
          { icon: "🟢", label: "Actives (14j)", value: active },
          { icon: "😴", label: "Inactives", value: inactive },
          { icon: "🎯", label: "Complétion moy.", value: `${avgCompletion}%` },
          { icon: "⏱", label: "Temps moy./élève", value: `${avgTimePerStudent}min` },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl p-5 border border-cream-200 shadow-soft">
            <div className="text-2xl mb-1">{s.icon}</div>
            <div className="text-2xl font-bold font-playfair text-orange-600">{s.value}</div>
            <div className="text-xs text-gray-500 font-dm mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cours populaires + complétion */}
        <div className="bg-white rounded-2xl border border-cream-200 p-6">
          <h2 className="font-playfair text-lg font-bold text-gray-900 mb-4">Cours populaires</h2>
          <div className="space-y-3">
            {popular.map((c) => (
              <div key={c.id}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-700 font-dm truncate pr-2">{c.titre}</span>
                  <span className="text-gray-400 font-dm flex-shrink-0">{c.enrolled} insc. · {c.completion}% fini</span>
                </div>
                <div className="h-1.5 bg-cream-200 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-violet-500 to-orange-DEFAULT rounded-full" style={{ width: `${c.completion}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Vidéos les plus vues */}
        <div className="bg-white rounded-2xl border border-cream-200 p-6">
          <h2 className="font-playfair text-lg font-bold text-gray-900 mb-4">Vidéos les plus regardées</h2>
          {mostViewed.length === 0 ? (
            <p className="text-gray-400 text-sm font-dm">Pas encore de données de visionnage.</p>
          ) : (
            <div className="space-y-2">
              {mostViewed.map((v, i) => (
                <div key={i} className="flex items-center justify-between gap-2 text-sm">
                  <span className="text-gray-700 font-dm truncate">▶ {v.titre}</span>
                  <span className="text-gray-400 font-dm flex-shrink-0">{v.views} vues · {v.avgPct}%</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Taux d'abandon par cours */}
      <div className="bg-white rounded-2xl border border-cream-200 p-6 mt-6">
        <h2 className="font-playfair text-lg font-bold text-gray-900 mb-4">Taux d'abandon (jamais commencé)</h2>
        <div className="space-y-2">
          {[...courseStats].sort((a, b) => b.abandon - a.abandon).slice(0, 8).map((c) => (
            <div key={c.id} className="flex items-center gap-3">
              <span className="text-sm text-gray-700 font-dm truncate flex-1">{c.titre}</span>
              <div className="w-32 h-1.5 bg-cream-200 rounded-full overflow-hidden flex-shrink-0">
                <div className="h-full bg-red-400 rounded-full" style={{ width: `${c.abandon}%` }} />
              </div>
              <span className="text-xs text-gray-400 font-dm w-10 text-right flex-shrink-0">{c.abandon}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
