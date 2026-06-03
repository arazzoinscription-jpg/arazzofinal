"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// ─── Types partagés ──────────────────────────────────────────────────────────
export interface UserStats {
  xpTotal: number;
  xpThisMonth: number;
  level: string;
  nextLevel: string | null;
  xpToNext: number;
  tierPct: number;          // % vers le niveau suivant
  currentStreak: number;
  longestStreak: number;
  weeklyGoal: number;
  weekDone: number;         // leçons terminées cette semaine
  badges: {
    slug: string; name: string; description: string; icon: string;
    category: string | null; xp_reward: number; earnedAt: string | null;
  }[];
  recentXp: { amount: number; reason: string; created_at: string }[];
  activityDays: string[];   // dates ISO (YYYY-MM-DD) actives sur 7 jours
}

export interface LeaderboardRow {
  rang: number; studentId: string; nom: string; xp: number; niveau: string;
}

const TIERS: { xp: number; label: string }[] = [
  { xp: 0, label: "apprentie" }, { xp: 200, label: "couturière" }, { xp: 500, label: "modéliste" },
  { xp: 1000, label: "styliste" }, { xp: 2000, label: "maître couturière" }, { xp: 4000, label: "créatrice de mode" },
];

/** Récupère toutes les stats de gamification de l'utilisatrice connectée. */
export async function getUserStats(): Promise<UserStats | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("users")
    .select("xp_total, xp_this_month, level_label, current_streak, longest_streak, weekly_goal")
    .eq("id", user.id).single();

  const xp = profile?.xp_total ?? 0;
  const next = TIERS.find((t) => t.xp > xp) ?? null;
  const prev = [...TIERS].reverse().find((t) => t.xp <= xp) ?? TIERS[0];
  const tierPct = next ? Math.round(((xp - prev.xp) / (next.xp - prev.xp)) * 100) : 100;

  // Badges (tous + état obtenu)
  const { data: allBadges } = await supabase
    .from("badges").select("slug, name, description, icon, category, xp_reward")
    .not("slug", "is", null).order("xp_reward", { ascending: true });
  const { data: mine } = await supabase
    .from("student_badges").select("earned_at, badge:badges(slug)").eq("student_id", user.id);
  const earnedMap = new Map<string, string>();
  (mine ?? []).forEach((m) => {
    const slug = (m.badge as { slug?: string } | null)?.slug;
    if (slug) earnedMap.set(slug, m.earned_at as string);
  });
  const badges = (allBadges ?? []).map((b) => ({
    slug: b.slug as string, name: b.name as string, description: b.description as string,
    icon: b.icon as string, category: b.category as string | null, xp_reward: b.xp_reward as number,
    earnedAt: earnedMap.get(b.slug as string) ?? null,
  }));

  // XP récents
  const { data: recentXp } = await supabase
    .from("xp_transactions").select("amount, reason, created_at")
    .eq("student_id", user.id).order("created_at", { ascending: false }).limit(8);

  // Objectif hebdo : leçons terminées depuis lundi
  const monday = new Date();
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  monday.setHours(0, 0, 0, 0);
  const { count: weekDone } = await supabase
    .from("progress").select("*", { count: "exact", head: true })
    .eq("user_id", user.id).gte("completed_at", monday.toISOString());

  // Jours actifs (7 derniers jours) — via progress + xp_transactions
  const since = new Date(Date.now() - 6 * 86400000); since.setHours(0, 0, 0, 0);
  const [{ data: prog }, { data: xptx }] = await Promise.all([
    supabase.from("progress").select("completed_at").eq("user_id", user.id).gte("completed_at", since.toISOString()),
    supabase.from("xp_transactions").select("created_at").eq("student_id", user.id).gte("created_at", since.toISOString()),
  ]);
  const days = new Set<string>();
  (prog ?? []).forEach((p) => p.completed_at && days.add(String(p.completed_at).slice(0, 10)));
  (xptx ?? []).forEach((x) => x.created_at && days.add(String(x.created_at).slice(0, 10)));

  return {
    xpTotal: xp,
    xpThisMonth: profile?.xp_this_month ?? 0,
    level: profile?.level_label ?? "apprentie",
    nextLevel: next?.label ?? null,
    xpToNext: next ? next.xp - xp : 0,
    tierPct,
    currentStreak: profile?.current_streak ?? 0,
    longestStreak: profile?.longest_streak ?? 0,
    weeklyGoal: profile?.weekly_goal ?? 3,
    weekDone: weekDone ?? 0,
    badges,
    recentXp: (recentXp ?? []) as UserStats["recentXp"],
    activityDays: [...days],
  };
}

/** Classement mensuel (top 50 → on tronquera côté UI). */
export async function getLeaderboard(): Promise<LeaderboardRow[]> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_monthly_leaderboard");
  return ((data ?? []) as {
    rang: number; student_id: string; nom: string; xp_mois: number; niveau: string;
  }[]).map((r) => ({ rang: r.rang, studentId: r.student_id, nom: r.nom, xp: r.xp_mois, niveau: r.niveau }));
}

/** Met à jour l'objectif hebdomadaire (1 à 14 leçons). */
export async function updateWeeklyGoal(goal: number) {
  const parsed = z.number().int().min(1).max(14).safeParse(goal);
  if (!parsed.success) return { ok: false, error: "Objectif invalide (1 à 14)." };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Non authentifié." };
  const { error } = await supabase.from("users").update({ weekly_goal: parsed.data }).eq("id", user.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/dashboard/recompenses");
  return { ok: true };
}
