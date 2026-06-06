import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { DICT, normLang } from "./dash-i18n";
import { RoleRequestCTA } from "./role-request/cta";
import {
  Reveal, StaggerGroup, StaggerItem, StaggerLink, CtaLink, AnimatedBadge, HoverTile, Counter,
} from "./anim";
import {
  Flame, Sparkles, BookOpen, CheckCircle2, Play, ArrowUpRight, Trophy, Zap, Calendar,
} from "lucide-react";

export const metadata = { title: "Mon espace — Arazzo Formation" };
export const dynamic = "force-dynamic";

const LOCALE: Record<string, string> = { fr: "fr-FR", ar: "ar", en: "en-US" };

const FALLBACKS = ["/images/mannequin-couture.jpg", "/images/mannequin-dessin.jpg", "/images/mannequin-mode.jpg"];

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("users").select("nom, role, xp_total, xp_this_month, level_label, current_streak, weekly_goal")
    .eq("id", user!.id).single();

  // Demandes de rôle (élève → formatrice / patronniste)
  const { data: roleReqs } = await supabase
    .from("role_requests")
    .select("requested_role, statut, created_at")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false });
  const latestStatus = (r: "formateur" | "patronniste"): "none" | "en_attente" | "approuve" | "refuse" =>
    (roleReqs?.find((x) => x.requested_role === r)?.statut as "en_attente" | "approuve" | "refuse" | undefined) ?? "none";

  const { data: enrollments } = await supabase
    .from("enrollments")
    .select(`id, course:courses(id, titre_fr, thumbnail, chapters(lessons(id)))`)
    .eq("user_id", user!.id).order("paid_at", { ascending: false });

  const { data: progressRecords } = await supabase
    .from("progress").select("lesson_id, completed_at").eq("user_id", user!.id);
  const completed = new Set((progressRecords ?? []).map((p) => p.lesson_id));

  const { data: nextSessions } = await supabase
    .from("live_sessions").select("titre, starts_at").gte("starts_at", new Date().toISOString())
    .order("starts_at", { ascending: true }).limit(1);
  const nextSession = nextSessions?.[0] as { titre?: string; starts_at?: string } | undefined;

  type Course = { id: string; titre: string; thumbnail: string | null; total: number; done: number; pct: number; firstLesson: string | null };
  const courses: Course[] = (enrollments ?? []).map((e) => {
    const c = e.course as any;
    const lessons: { id: string }[] = c?.chapters?.flatMap((ch: any) => ch.lessons ?? []) ?? [];
    const total = lessons.length;
    const done = lessons.filter((l) => completed.has(l.id)).length;
    return {
      id: c?.id, titre: c?.titre_fr ?? "Formation", thumbnail: c?.thumbnail ?? null,
      total, done, pct: total ? Math.round((done / total) * 100) : 0,
      firstLesson: lessons.find((l) => !completed.has(l.id))?.id ?? lessons[0]?.id ?? null,
    };
  });

  const xpTotal = profile?.xp_total ?? 0;
  const streak = profile?.current_streak ?? 0;
  const lessonsDone = completed.size;
  const hero = courses.find((c) => c.pct < 100 && c.done > 0) ?? courses.find((c) => c.pct < 100) ?? courses[0];
  const heroImg = hero?.thumbnail || FALLBACKS[0];
  const others = courses.filter((c) => c.id !== hero?.id).slice(0, 3);
  const prenom = profile?.nom?.split(" ")[0] ?? "";

  const todayKey = new Date().toISOString().slice(0, 10);
  const lessonsToday = (progressRecords ?? []).filter((p) => p.completed_at?.slice(0, 10) === todayKey).length;
  const xpToday = lessonsToday * 20;

  const lang = normLang((await cookies()).get("lang")?.value);
  const t = DICT[lang];

  // Styles réutilisés (clair / sombre)
  const card = "bg-white border border-cream-200 shadow-sm dark:bg-white/[0.04] dark:border-white/10 dark:shadow-none";
  const muted = "text-gray-500 dark:text-white/50";

  return (
    <div className="-mx-4 sm:-mx-6 lg:-mx-8 -mt-4 sm:-mt-6 lg:-mt-8 -mb-4 sm:-mb-6 lg:-mb-8 px-4 sm:px-5 lg:px-8 py-7 min-h-[calc(100vh-4rem)] bg-cream-DEFAULT text-gray-900 dark:bg-[#0d0a1c] dark:text-white">
      {/* En-tête */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-playfair text-3xl font-bold">{t.greeting}, {prenom} 👋</h1>
          <p className={`${muted} font-dm text-sm mt-1 capitalize`}>
            {new Date().toLocaleDateString(LOCALE[lang], { weekday: "long", day: "numeric", month: "long" })}
          </p>
        </div>
        <AnimatedBadge className={`hidden sm:flex items-center gap-2 rounded-2xl px-4 py-2 ${card}`}>
          <Trophy size={18} className="text-orange-500 dark:text-orange-300" />
          <span className="text-sm font-semibold capitalize">{profile?.level_label ?? "apprentie"}</span>
        </AnimatedBadge>
      </div>

      {(profile?.role ?? "eleve") === "eleve" && (
        <div className="mb-6">
          <RoleRequestCTA
            formateurStatus={latestStatus("formateur")}
            patronnisteStatus={latestStatus("patronniste")}
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* ── Colonne gauche ── */}
        <StaggerGroup className="space-y-4" stagger={0.1}>
          {/* Carte série */}
          <StaggerItem className={`rounded-3xl p-6 ${card}`}>
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-end gap-2">
                  <span className="font-playfair text-5xl font-bold">{streak}</span>
                  <span className={`${muted} mb-2 font-dm`}>{t.streakDays}</span>
                </div>
                <p className={`${muted} font-dm mt-1`}>{t.streakNow}</p>
              </div>
              <span className="w-14 h-14 rounded-2xl bg-orange-500/15 dark:bg-orange-500/20 flex items-center justify-center text-orange-500 dark:text-orange-300">
                <Flame size={26} />
              </span>
            </div>
            <div className="mt-5 pt-4 border-t border-cream-200 dark:border-white/10 grid grid-cols-3 gap-2 text-center">
              <div><Counter value={lessonsDone} className="text-lg font-bold" /><div className={`text-[11px] ${muted} font-dm`}>{t.lessons}</div></div>
              <div><Counter value={xpTotal} className="text-lg font-bold" /><div className={`text-[11px] ${muted} font-dm`}>{t.xpTotal}</div></div>
              <div><Counter value={courses.length} className="text-lg font-bold" /><div className={`text-[11px] ${muted} font-dm`}>{t.courses}</div></div>
            </div>
          </StaggerItem>

          {/* Carte activité */}
          <StaggerItem className={`rounded-3xl p-6 ${card}`}>
            <h3 className="font-bold text-lg">{t.activity}</h3>
            <p className={`${muted} text-sm font-dm mb-4`}>{t.activitySub}</p>
            <div className="grid grid-cols-2 gap-3 mb-5">
              <HoverTile className="rounded-2xl p-4 bg-gradient-to-br from-violet-500 to-violet-700 text-white">
                <Zap size={18} className="mb-3" />
                <div className="font-playfair text-2xl font-bold">{xpToday}</div>
                <div className="text-[11px] text-white/70 font-dm mt-0.5">{t.today}</div>
              </HoverTile>
              <HoverTile className="rounded-2xl p-4 bg-gradient-to-br from-orange-400 to-orange-600 text-white">
                <Sparkles size={18} className="mb-3" />
                <div className="font-playfair text-2xl font-bold">{profile?.xp_this_month ?? 0}</div>
                <div className="text-[11px] text-white/80 font-dm mt-0.5">{t.thisMonth}</div>
              </HoverTile>
            </div>
            <div className="space-y-3">
              {courses.slice(0, 3).map((c) => (
                <div key={c.id} className="flex items-center gap-3">
                  <span className="w-9 h-9 rounded-xl bg-orange-50 dark:bg-white/10 flex items-center justify-center text-orange-500 dark:text-orange-300 flex-shrink-0"><BookOpen size={16} /></span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{c.titre}</p>
                    <div className="h-1 bg-cream-200 dark:bg-white/10 rounded-full mt-1 overflow-hidden">
                      <div className="h-full bg-orange-DEFAULT rounded-full" style={{ width: `${c.pct}%` }} />
                    </div>
                  </div>
                  <span className={`text-xs ${muted} font-dm`}>{c.pct}%</span>
                </div>
              ))}
              {courses.length === 0 && <p className={`text-sm ${muted} font-dm`}>Aucun cours pour l'instant.</p>}
            </div>
          </StaggerItem>
        </StaggerGroup>

        {/* ── Colonne droite ── */}
        <div className="lg:col-span-2 space-y-4">
          {/* Héro (image + lecteur) — texte blanc dans les deux thèmes (sur photo) */}
          <Reveal className="relative rounded-3xl overflow-hidden border border-cream-200 dark:border-white/10 h-[22rem] text-white" duration={0.6}>
            <img src={heroImg} alt="" className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0d0a1c] via-[#0d0a1c]/40 to-transparent" />
            {hero ? (
              <>
                <div className="absolute top-4 start-4">
                  <span className="inline-flex items-center gap-1.5 bg-orange-DEFAULT text-white text-xs font-bold px-3 py-1.5 rounded-full">● {t.inProgress}</span>
                </div>
                <div className="absolute top-4 end-4 flex items-center gap-2 text-xs font-semibold">
                  <span className="bg-black/40 backdrop-blur px-3 py-1.5 rounded-full">{t.ofLessons(hero.done, hero.total)}</span>
                  <span className="bg-black/40 backdrop-blur px-3 py-1.5 rounded-full">{hero.pct}%</span>
                </div>
                <div className="absolute bottom-4 start-4 end-4">
                  <p className="text-white/60 text-xs font-dm mb-1">{t.resume}</p>
                  <h2 className="font-playfair text-2xl font-bold mb-3 line-clamp-1">{hero.titre}</h2>
                  <div className="flex items-center gap-3 bg-black/40 backdrop-blur-md rounded-2xl p-2.5">
                    <a href={`/dashboard/cours/${hero.firstLesson ?? hero.id}`}
                      className="w-11 h-11 rounded-full bg-orange-DEFAULT hover:bg-orange-600 flex items-center justify-center flex-shrink-0 transition-colors">
                      <Play size={18} className="text-white fill-white ml-0.5" />
                    </a>
                    <div className="flex-1 min-w-0">
                      <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-orange-DEFAULT to-orange-400 rounded-full" style={{ width: `${hero.pct}%` }} />
                      </div>
                    </div>
                    <span className="text-xs text-white/70 font-dm flex-shrink-0">{hero.pct}%</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
                <p className="text-white/70 font-dm mb-4">{t.noCourse}</p>
                <CtaLink href="/formations" className="bg-orange-DEFAULT px-6 py-3 rounded-xl font-semibold">{t.explore}</CtaLink>
              </div>
            )}
          </Reveal>

          {/* Cartes cours */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {others.length > 0 ? others.map((c, i) => (
              <a key={c.id} href={`/dashboard/cours/${c.firstLesson ?? c.id}`}
                className="group relative rounded-3xl overflow-hidden border border-cream-200 dark:border-white/10 h-44 text-white">
                <img src={c.thumbnail || FALLBACKS[(i + 1) % FALLBACKS.length]} alt=""
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0d0a1c] via-[#0d0a1c]/30 to-transparent" />
                <span className="absolute top-3 right-3 w-10 h-10 rounded-full bg-orange-DEFAULT group-hover:bg-orange-600 flex items-center justify-center transition-colors">
                  <Play size={15} className="text-white fill-white ml-0.5" />
                </span>
                <div className="absolute bottom-0 start-0 end-0 p-4">
                  <h3 className="font-semibold line-clamp-1">{c.titre}</h3>
                  <p className="text-xs text-white/50 font-dm mt-0.5">{c.pct}% {t.completed}</p>
                </div>
              </a>
            )) : (
              <div className={`sm:col-span-3 rounded-3xl p-6 text-center font-dm ${card} ${muted}`}>
                {t.soonHere}
              </div>
            )}
          </div>

          {/* Raccourcis */}
          <StaggerGroup className="grid grid-cols-1 sm:grid-cols-2 gap-4" stagger={0.15}>
            <StaggerLink href="/dashboard/sessions" className={`flex items-center gap-3 rounded-3xl p-5 transition-colors hover:bg-cream-50 dark:hover:bg-white/[0.07] ${card}`}>
              <span className="w-11 h-11 rounded-2xl bg-violet-500/15 dark:bg-violet-500/20 text-violet-600 dark:text-violet-300 flex items-center justify-center"><Calendar size={20} /></span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">{t.nextSession}</p>
                <p className={`text-xs ${muted} font-dm truncate`}>{nextSession?.titre ?? t.noSession}</p>
              </div>
              <ArrowUpRight size={18} className="text-gray-300 dark:text-white/30" />
            </StaggerLink>
            <StaggerLink href="/dashboard/recompenses" className={`flex items-center gap-3 rounded-3xl p-5 transition-colors hover:bg-cream-50 dark:hover:bg-white/[0.07] ${card}`}>
              <span className="w-11 h-11 rounded-2xl bg-orange-500/15 dark:bg-orange-500/20 text-orange-500 dark:text-orange-300 flex items-center justify-center"><CheckCircle2 size={20} /></span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">{t.rewards}</p>
                <p className={`text-xs ${muted} font-dm`}>{t.weeklyGoal(profile?.weekly_goal ?? 3)}</p>
              </div>
              <ArrowUpRight size={18} className="text-gray-300 dark:text-white/30" />
            </StaggerLink>
          </StaggerGroup>
        </div>
      </div>
    </div>
  );
}
