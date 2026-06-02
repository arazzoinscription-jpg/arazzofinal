import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email";
import { tplReactivation } from "@/lib/email-templates";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://arazzo-bice.vercel.app";
const DAY = 1000 * 60 * 60 * 24;

type Stage = "reminder_7" | "motivation_14" | "direct_30" | "notify_teacher_60";

/** Détermine le palier d'inactivité atteint (le plus élevé). */
function stageFor(days: number): Stage | null {
  if (days >= 60) return "notify_teacher_60";
  if (days >= 30) return "direct_30";
  if (days >= 14) return "motivation_14";
  if (days >= 7) return "reminder_7";
  return null;
}

export async function GET(req: NextRequest) {
  // Sécurité : header d'autorisation (Vercel Cron injecte Bearer CRON_SECRET)
  const auth = req.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const now = Date.now();
  const result = { reminder_7: 0, motivation_14: 0, direct_30: 0, notify_teacher_60: 0, skipped: 0 };

  // 1) Parcourir les utilisateurs auth (pagination)
  let page = 1;
  const authUsers: { id: string; email: string; last_sign_in_at: string | null }[] = [];
  while (true) {
    const { data } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (!data || data.users.length === 0) break;
    data.users.forEach((u) =>
      authUsers.push({ id: u.id, email: u.email ?? "", last_sign_in_at: u.last_sign_in_at ?? null })
    );
    if (data.users.length < 1000) break;
    page++;
  }

  for (const au of authUsers) {
    // On ne cible que les utilisatrices déjà connectées au moins une fois
    if (!au.last_sign_in_at) continue;
    const days = Math.floor((now - new Date(au.last_sign_in_at).getTime()) / DAY);
    const stage = stageFor(days);
    if (!stage) continue;

    // Anti-doublon
    const { data: already } = await admin
      .from("reactivation_log")
      .select("id")
      .eq("user_id", au.id)
      .eq("stage", stage)
      .maybeSingle();
    if (already) continue;

    // Profil + cible étudiante (au moins une inscription)
    const { data: profile } = await admin
      .from("users")
      .select("nom, email, role")
      .eq("id", au.id)
      .single();
    if (!profile || profile.role !== "eleve") continue;

    const { count: enrollCount } = await admin
      .from("enrollments")
      .select("*", { count: "exact", head: true })
      .eq("user_id", au.id);
    if (!enrollCount) continue;

    const prenom = (profile.nom || "").split(" ")[0] || "chère élève";

    if (stage === "notify_teacher_60") {
      // Notifier les formateurs des cours de l'étudiante + journaliser
      const { data: formateurs } = await admin
        .from("enrollments")
        .select("course:courses(formateur_id)")
        .eq("user_id", au.id);
      const ids = [
        ...new Set(
          (formateurs ?? [])
            .map((e) => (e.course as { formateur_id?: string } | null)?.formateur_id)
            .filter(Boolean) as string[]
        ),
      ];
      for (const fid of ids) {
        await admin.from("notifications").insert({
          user_id: fid,
          type: "system",
          title: "Étudiante inactive depuis 60 jours",
          body: `${profile.nom} n'est plus connectée depuis 60 jours.`,
          link: "/formateur",
        });
      }
      result.notify_teacher_60++;
    } else {
      // Lien : direct vers la dernière leçon au palier 30j, sinon dashboard
      let lien = `${SITE}/dashboard`;
      if (stage === "direct_30") {
        const { data: last } = await admin
          .from("progress")
          .select("lesson_id")
          .eq("user_id", au.id)
          .order("completed_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (last?.lesson_id) lien = `${SITE}/dashboard/cours/${last.lesson_id}`;
      }
      const tpl = tplReactivation(prenom, stage, lien);
      const res = await sendEmail({
        userId: au.id, to: profile.email, category: "reactivation",
        subject: tpl.subject, html: tpl.html,
      });
      if (res.skipped) result.skipped++;
      else result[stage]++;
    }

    // Journaliser le palier (évite tout renvoi)
    await admin.from("reactivation_log").insert({ user_id: au.id, stage });
  }

  return NextResponse.json({ ok: true, processed: authUsers.length, ...result });
}
