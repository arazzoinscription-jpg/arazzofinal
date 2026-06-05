import { createClient } from "@/lib/supabase/server";
import {
  Flame, Sparkles, BookOpen, CheckCircle2, Play, ArrowUpRight, Trophy, Zap, Calendar,
} from "lucide-react";

export const metadata = { title: "Mon espace — Arazzo Formation" };
export const dynamic = "force-dynamic";

const FALLBACKS = ["/images/mannequin-couture.jpg", "/images/mannequin-dessin.jpg", "/images/mannequin-mode.jpg"];

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("users").select("nom, xp_total, xp_this_month, level_label, current_streak, weekly_goal")
    .eq("id", user!.id).single();

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

  // XP du jour (transactions du jour si dispo, sinon estimation via leçons du jour)
  const todayKey = new Date().toISOString().slice(0, 10);
  const lessonsToday = (progressRecords ?? []).filter((p) => p.completed_at?.slice(0, 10) === todayKey).length;
  const xpToday = lessonsToday * 20;

  return (
    <div className="-mx-6 lg:-mx-8 -mt-6 lg:-mt-8 -mb-6 lg:-mb-8 px-5 lg:px-8 py-7 min-h-[calc(100vh-4rem)] bg-[#0d0a1c] text-white">
      {/* En-tête */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-playfair text-3xl font-bold">Bonjour, {prenom} 👋</h1>
          <p className="text-white/50 font-dm text-sm mt-1 capitalize">
            {new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-2 bg-white/5 border border-white/10 rounded-2xl px-4 py-2">
          <Trophy size={18} className="text-orange-300" />
          <span className="text-sm font-semibold capitalize">{profile?.level_label ?? "apprentie"}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* ── Colonne gauche ── */}
        <div className="space-y-4">
          {/* Carte série (façon météo) */}
          <div className="bg-white/[0.04] border border-white/10 rounded-3xl p-6">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-end gap-2">
                  <span className="font-playfair text-5xl font-bold">{streak}</span>
                  <span className="text-white/50 mb-2 font-dm">jours</span>
                </div>
                <p className="text-white/60 font-dm mt-1">Série en cours</p>
              </div>
              <span className="w-14 h-14 rounded-2xl bg-orange-500/20 flex items-center justify-center text-orange-300">
                <Flame size={26} />
              </span>
            </div>
            <div className="mt-5 pt-4 border-t border-white/10 grid grid-cols-3 gap-2 text-center">
              <div><div className="text-lg font-bold">{lessonsDone}</div><div className="text-[11px] text-white/40 font-dm">Leçons</div></div>
              <div><div className="text-lg font-bold">{xpTotal}</div><div className="text-[11px] text-white/40 font-dm">XP total</div></div>
              <div><div className="text-lg font-bold">{courses.length}</div><div className="text-[11px] text-white/40 font-dm">Cours</div></div>
            </div>
          </div>

          {/* Carte activité (façon power consumption) */}
          <div className="bg-white/[0.04] border border-white/10 rounded-3xl p-6">
            <h3 className="font-bold text-lg">Activité d'apprentissage</h3>
            <p className="text-white/50 text-sm font-dm mb-4">Votre progression XP</p>
            <div className="grid grid-cols-2 gap-3 mb-5">
              <div className="rounded-2xl p-4 bg-gradient-to-br from-violet-500 to-violet-700">
                <Zap size={18} className="mb-3" />
                <div className="font-playfair text-2xl font-bold">{xpToday}</div>
                <div className="text-[11px] text-white/70 font-dm mt-0.5">AUJOURD'HUI</div>
              </div>
              <div className="rounded-2xl p-4 bg-gradient-to-br from-orange-400 to-orange-600">
                <Sparkles size={18} className="mb-3" />
                <div className="font-playfair text-2xl font-bold">{profile?.xp_this_month ?? 0}</div>
                <div className="text-[11px] text-white/80 font-dm mt-0.5">CE MOIS</div>
              </div>
            </div>
            <div className="space-y-3">
              {courses.slice(0, 3).map((c) => (
                <div key={c.id} className="flex items-center gap-3">
                  <span className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-orange-300 flex-shrink-0"><BookOpen size={16} /></span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{c.titre}</p>
                    <div className="h-1 bg-white/10 rounded-full mt-1 overflow-hidden">
                      <div className="h-full bg-orange-DEFAULT rounded-full" style={{ width: `${c.pct}%` }} />
                    </div>
                  </div>
                  <span className="text-xs text-white/50 font-dm">{c.pct}%</span>
                </div>
              ))}
              {courses.length === 0 && <p className="text-sm text-white/40 font-dm">Aucun cours pour l'instant.</p>}
            </div>
          </div>
        </div>

        {/* ── Colonne droite (héro + cartes) ── */}
        <div className="lg:col-span-2 space-y-4">
          {/* Héro : reprendre le cours (façon featured + player) */}
          <div className="relative rounded-3xl overflow-hidden border border-white/10 h-[22rem]">
            <img src={heroImg} alt="" className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0d0a1c] via-[#0d0a1c]/40 to-transparent" />

            {hero ? (
              <>
                {/* chips haut */}
                <div className="absolute top-4 left-4 flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 bg-orange-DEFAULT text-white text-xs font-bold px-3 py-1.5 rounded-full">● EN COURS</span>
                </div>
                <div className="absolute top-4 right-4 flex items-center gap-2 text-xs font-semibold">
                  <span className="bg-black/40 backdrop-blur px-3 py-1.5 rounded-full">{hero.done}/{hero.total} leçons</span>
                  <span className="bg-black/40 backdrop-blur px-3 py-1.5 rounded-full">{hero.pct}%</span>
                </div>

                {/* barre lecteur en bas */}
                <div className="absolute bottom-4 left-4 right-4">
                  <p className="text-white/60 text-xs font-dm mb-1">Reprendre votre formation</p>
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
                <p className="text-white/70 font-dm mb-4">Vous n'avez pas encore de formation.</p>
                <a href="/formations" className="bg-orange-DEFAULT px-6 py-3 rounded-xl font-semibold hover:bg-orange-600">Explorer le catalogue</a>
              </div>
            )}
          </div>

          {/* Cartes cours (façon devices) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {others.length > 0 ? others.map((c, i) => (
              <a key={c.id} href={`/dashboard/cours/${c.firstLesson ?? c.id}`}
                className="group relative rounded-3xl overflow-hidden border border-white/10 h-44">
                <img src={c.thumbnail || FALLBACKS[(i + 1) % FALLBACKS.length]} alt=""
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0d0a1c] via-[#0d0a1c]/30 to-transparent" />
                <span className="absolute top-3 right-3 w-10 h-10 rounded-full bg-orange-DEFAULT group-hover:bg-orange-600 flex items-center justify-center transition-colors">
                  <Play size={15} className="text-white fill-white ml-0.5" />
                </span>
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <h3 className="font-semibold line-clamp-1">{c.titre}</h3>
                  <p className="text-xs text-white/50 font-dm mt-0.5">{c.pct}% terminé</p>
                </div>
              </a>
            )) : (
              <div className="sm:col-span-3 bg-white/[0.04] border border-white/10 rounded-3xl p-6 text-center text-white/40 font-dm">
                Vos prochaines formations apparaîtront ici.
              </div>
            )}
          </div>

          {/* Bandeaux raccourcis */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <a href="/dashboard/sessions" className="flex items-center gap-3 bg-white/[0.04] border border-white/10 rounded-3xl p-5 hover:bg-white/[0.07] transition-colors">
              <span className="w-11 h-11 rounded-2xl bg-violet-500/20 text-violet-300 flex items-center justify-center"><Calendar size={20} /></span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">Prochaine session live</p>
                <p className="text-xs text-white/50 font-dm truncate">{nextSession?.titre ?? "Aucune programmée"}</p>
              </div>
              <ArrowUpRight size={18} className="text-white/30" />
            </a>
            <a href="/dashboard/recompenses" className="flex items-center gap-3 bg-white/[0.04] border border-white/10 rounded-3xl p-5 hover:bg-white/[0.07] transition-colors">
              <span className="w-11 h-11 rounded-2xl bg-orange-500/20 text-orange-300 flex items-center justify-center"><CheckCircle2 size={20} /></span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">Mes récompenses & badges</p>
                <p className="text-xs text-white/50 font-dm">Objectif : {profile?.weekly_goal ?? 3} leçons / semaine</p>
              </div>
              <ArrowUpRight size={18} className="text-white/30" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
