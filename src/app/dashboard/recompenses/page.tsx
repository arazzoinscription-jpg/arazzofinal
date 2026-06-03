import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getUserStats, getLeaderboard } from "@/app/actions/gamification";
import { XPBar } from "@/components/gamification/XPBar";
import { StreakWidget } from "@/components/gamification/StreakWidget";
import { WeeklyGoal } from "@/components/gamification/WeeklyGoal";
import { BadgesGrid } from "@/components/gamification/BadgesGrid";
import { Leaderboard } from "@/components/gamification/Leaderboard";

export const metadata = { title: "Récompenses — Arazzo Formation" };
export const dynamic = "force-dynamic";

const REASON_LABEL: Record<string, string> = {
  lesson_complete: "Leçon terminée", quiz_passed: "Quiz réussi", practical_approved: "Travail validé",
};

export default async function RecompensesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [stats, leaderboard] = await Promise.all([getUserStats(), getLeaderboard()]);
  if (!stats) redirect("/login");

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="font-playfair text-3xl font-bold text-gray-900">Mes récompenses</h1>
        <p className="text-gray-500 mt-1 font-dm">Niveau, série, badges et classement du mois.</p>
      </div>

      {/* Niveau + XP */}
      <XPBar level={stats.level} nextLevel={stats.nextLevel} xpTotal={stats.xpTotal}
        xpToNext={stats.xpToNext} tierPct={stats.tierPct} />

      {/* Série + Objectif hebdo */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <StreakWidget streak={stats.currentStreak} activityDays={stats.activityDays} />
        <WeeklyGoal goal={stats.weeklyGoal} done={stats.weekDone} />
      </div>

      {/* XP récents */}
      {stats.recentXp.length > 0 && (
        <div className="bg-white rounded-2xl border border-cream-200 shadow-soft p-5">
          <h3 className="font-playfair text-lg font-bold text-gray-900 mb-3">Activité XP récente</h3>
          <div className="space-y-1.5">
            {stats.recentXp.map((x, i) => (
              <div key={i} className="flex items-center justify-between text-sm font-dm">
                <span className="text-gray-600">
                  {REASON_LABEL[x.reason] ?? (x.reason.startsWith("badge:") ? "🏅 Badge débloqué" : x.reason)}
                </span>
                <span className="font-bold text-orange-DEFAULT">+{x.amount} XP</span>
              </div>
            ))}
          </div>
          <Link href="/dashboard/progression" className="inline-block mt-3 text-sm text-violet-DEFAULT font-semibold hover:underline">
            Voir ma progression détaillée (heatmap, estimation de fin) →
          </Link>
        </div>
      )}

      {/* Badges */}
      <BadgesGrid badges={stats.badges} />

      {/* Classement */}
      <div>
        <h2 className="font-playfair text-xl font-bold text-gray-900 mb-4">🏆 Classement du mois</h2>
        <Leaderboard rows={leaderboard} currentUserId={user.id} />
      </div>
    </div>
  );
}
