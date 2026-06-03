import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const metadata = { title: "Récompenses — Arazzo Formation" };
export const dynamic = "force-dynamic";

const TIERS = [
  { xp: 0, label: "apprentie" }, { xp: 200, label: "couturière" }, { xp: 500, label: "modéliste" },
  { xp: 1000, label: "styliste" }, { xp: 2000, label: "maître couturière" }, { xp: 4000, label: "créatrice de mode" },
];

export default async function RecompensesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users").select("nom, xp_total, xp_this_month, level_label, current_streak, longest_streak, weekly_goal")
    .eq("id", user.id).single();

  const { data: allBadges } = await supabase
    .from("badges").select("slug, name, description, icon, category, xp_reward")
    .not("slug", "is", null).order("xp_reward", { ascending: true });

  const { data: mine } = await supabase
    .from("student_badges").select("badge:badges(slug), earned_at").eq("student_id", user.id);
  const earned = new Map((mine ?? []).map((m) => [(m.badge as { slug?: string })?.slug, m.earned_at]));

  // Objectif hebdo : leçons complétées depuis lundi
  const monday = new Date(); monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7)); monday.setHours(0, 0, 0, 0);
  const { count: weekDone } = await supabase
    .from("progress").select("*", { count: "exact", head: true })
    .eq("user_id", user.id).gte("completed_at", monday.toISOString());
  const goal = profile?.weekly_goal ?? 3;

  // Classement mensuel
  const { data: leaderboard } = await supabase.rpc("get_monthly_leaderboard");

  const xp = profile?.xp_total ?? 0;
  const nextTier = TIERS.find((t) => t.xp > xp);
  const prevTier = [...TIERS].reverse().find((t) => t.xp <= xp) ?? TIERS[0];
  const tierPct = nextTier ? Math.round(((xp - prevTier.xp) / (nextTier.xp - prevTier.xp)) * 100) : 100;

  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <h1 className="font-playfair text-3xl font-bold text-gray-900">Mes récompenses</h1>
        <p className="text-gray-500 mt-1 font-dm">Votre progression, vos badges et votre classement.</p>
      </div>

      {/* Niveau + XP */}
      <div className="bg-gradient-to-br from-violet-DEFAULT to-violet-800 rounded-3xl p-6 text-white mb-6 shadow-glow">
        <div className="flex items-end justify-between">
          <div>
            <div className="text-violet-200 text-sm font-dm">Niveau actuel</div>
            <div className="font-playfair text-3xl font-bold capitalize">{profile?.level_label ?? "apprentie"}</div>
          </div>
          <div className="text-right">
            <div className="font-playfair text-3xl font-bold">{xp} XP</div>
            <div className="text-violet-200 text-sm font-dm">🔥 {profile?.current_streak ?? 0} j · record {profile?.longest_streak ?? 0} j</div>
          </div>
        </div>
        <div className="mt-4 h-2.5 bg-white/15 rounded-full overflow-hidden">
          <div className="h-full bg-orange-DEFAULT rounded-full" style={{ width: `${tierPct}%` }} />
        </div>
        <div className="text-xs text-violet-200 mt-1.5 font-dm">
          {nextTier ? `${nextTier.xp - xp} XP avant « ${nextTier.label} »` : "Niveau maximum atteint 🎉"}
        </div>
      </div>

      {/* Objectif hebdo */}
      <div className="bg-white rounded-2xl border border-cream-200 p-5 mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="font-semibold text-gray-900 font-dm">🎯 Objectif de la semaine</span>
          <span className="text-sm font-bold text-violet-DEFAULT">{Math.min(weekDone ?? 0, goal)}/{goal} leçons</span>
        </div>
        <div className="h-2 bg-cream-200 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-violet-500 to-orange-DEFAULT rounded-full"
            style={{ width: `${Math.min(100, ((weekDone ?? 0) / goal) * 100)}%` }} />
        </div>
        {(weekDone ?? 0) >= goal && <p className="text-xs text-green-600 mt-1.5 font-dm">Objectif atteint, bravo ! 🌟</p>}
      </div>

      {/* Badges */}
      <h2 className="font-playfair text-xl font-bold text-gray-900 mb-4">Badges ({earned.size}/{allBadges?.length ?? 0})</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-10">
        {(allBadges ?? []).map((b) => {
          const got = earned.has(b.slug);
          return (
            <div key={b.slug} className={`rounded-2xl p-4 border text-center transition-all ${got ? "bg-white border-orange-200 shadow-soft" : "bg-cream-50 border-cream-200 opacity-60"}`}>
              <div className={`text-4xl mb-2 ${got ? "" : "grayscale"}`}>{b.icon}</div>
              <div className="font-semibold text-gray-900 font-dm text-sm">{b.name}</div>
              <div className="text-xs text-gray-400 font-dm mt-0.5">{b.description}</div>
              <div className="text-xs font-bold text-violet-DEFAULT mt-1">+{b.xp_reward} XP</div>
              {got && <div className="text-[10px] text-green-600 mt-1 font-dm">✓ Obtenu</div>}
            </div>
          );
        })}
      </div>

      {/* Classement */}
      <h2 className="font-playfair text-xl font-bold text-gray-900 mb-4">🏆 Classement du mois</h2>
      <div className="bg-white rounded-2xl border border-cream-200 overflow-hidden">
        {!leaderboard?.length ? (
          <div className="text-center py-10 text-gray-400">Le classement se remplit avec l'activité du mois.</div>
        ) : (
          <div className="divide-y divide-cream-100">
            {(leaderboard as any[]).map((r) => (
              <div key={r.student_id} className={`flex items-center gap-4 px-5 py-3 ${r.student_id === user.id ? "bg-violet-50" : ""}`}>
                <span className={`w-7 text-center font-bold font-playfair ${r.rang <= 3 ? "text-orange-DEFAULT" : "text-gray-400"}`}>
                  {r.rang <= 3 ? ["🥇", "🥈", "🥉"][r.rang - 1] : r.rang}
                </span>
                <span className="flex-1 font-medium text-gray-900 font-dm truncate">{r.nom}{r.student_id === user.id ? " (vous)" : ""}</span>
                <span className="text-xs text-gray-400 font-dm capitalize">{r.niveau}</span>
                <span className="font-bold text-violet-DEFAULT font-dm">{r.xp_mois} XP</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
