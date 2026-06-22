import { CalendarDays, BookOpen, GraduationCap, Flame, CheckCircle2, Trophy } from "lucide-react";
import type { StudentJourney } from "@/lib/community";

const T = {
  fr: { title: "Le parcours", since: "Membre depuis", courses: "Cours suivis", lessons: "Leçons terminées",
        avg: "Note moyenne", streak: "Série (jours)", xp: "Points XP", enrolled: "Inscrit·e", done: "Terminé",
        inDays: (d: number) => `terminé en ${d} j`, progress: "Progression", noCourses: "Aucune formation pour le moment." },
  ar: { title: "الرحلة", since: "عضو منذ", courses: "الدورات المتابَعة", lessons: "الدروس المكتملة",
        avg: "المعدل", streak: "التتابع (أيام)", xp: "نقاط الخبرة", enrolled: "مسجَّل", done: "مكتمل",
        inDays: (d: number) => `أُنجز في ${d} يوم`, progress: "التقدّم", noCourses: "لا توجد دورات بعد." },
  en: { title: "The journey", since: "Member since", courses: "Courses taken", lessons: "Lessons completed",
        avg: "Average grade", streak: "Streak (days)", xp: "XP points", enrolled: "Enrolled", done: "Completed",
        inDays: (d: number) => `done in ${d} d`, progress: "Progress", noCourses: "No course yet." },
} as const;

export function CommunityJourney({ journey, lang = "fr" }: { journey: StudentJourney; lang?: "fr" | "ar" | "en" }) {
  const t = T[lang];
  const rtl = lang === "ar";
  const fmtDate = (d: string | null) => d ? new Date(d).toLocaleDateString(lang === "ar" ? "ar" : lang === "en" ? "en-GB" : "fr-FR", { month: "long", year: "numeric" }) : "—";

  const stats = [
    { icon: BookOpen, label: t.courses, value: journey.coursesCount },
    { icon: CheckCircle2, label: t.lessons, value: `${journey.lessonsCompleted}/${journey.lessonsTotal}` },
    { icon: GraduationCap, label: t.avg, value: journey.avgScore != null ? `${journey.avgScore}%` : "—" },
    { icon: Flame, label: t.streak, value: journey.currentStreak },
  ];

  return (
    <div className="mt-8" dir={rtl ? "rtl" : "ltr"}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-white/90 inline-flex items-center gap-2"><Trophy size={17} className="text-orange-300" /> {t.title}</h2>
        <span className="inline-flex items-center gap-1.5 text-sm text-white/50"><CalendarDays size={14} /> {t.since} {fmtDate(journey.startedAt)}</span>
      </div>

      {/* Stat tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-5">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl bg-white/[0.05] border border-white/10 p-3.5 text-center">
            <s.icon size={18} className="mx-auto text-orange-300 mb-1.5" />
            <div className="text-xl font-bold text-white">{s.value}</div>
            <div className="text-[11px] text-white/50 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Formations + progression */}
      {journey.courses.length === 0 ? (
        <p className="text-white/50 font-dm text-center py-8">{t.noCourses}</p>
      ) : (
        <div className="space-y-2.5">
          {journey.courses.map((c, i) => (
            <div key={i} className="rounded-2xl bg-white/[0.05] border border-white/10 p-4">
              <div className="flex items-center justify-between gap-3 mb-2">
                <span className="text-sm font-semibold text-white truncate">{c.titre}</span>
                {c.done
                  ? <span className="flex-shrink-0 inline-flex items-center gap-1 text-[11px] font-semibold text-green-300 bg-green-500/15 rounded-full px-2 py-0.5"><CheckCircle2 size={12} /> {c.daysToFinish != null ? t.inDays(c.daysToFinish) : t.done}</span>
                  : <span className="flex-shrink-0 text-[11px] font-semibold text-orange-300">{c.pct}%</span>}
              </div>
              <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div className={`h-full rounded-full ${c.done ? "bg-green-400" : "bg-gradient-to-r from-violet-400 to-orange-400"}`} style={{ width: `${c.pct}%` }} />
              </div>
              <div className="mt-1.5 text-[11px] text-white/40">{t.enrolled} · {fmtDate(c.enrolledAt)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
