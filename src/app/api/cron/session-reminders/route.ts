import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email";
import { tplAnnouncement } from "@/lib/email-templates";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const H = 3600 * 1000;
const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://www.formation-arazzo.store";

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const now = Date.now();
  let j1 = 0, h1 = 0;

  // Sessions à venir dans les 30h
  const { data: sessions } = await admin
    .from("live_sessions")
    .select("id, titre, starts_at, meet_url, course_id, course:courses(titre_fr)")
    .gte("starts_at", new Date(now - H).toISOString())
    .lte("starts_at", new Date(now + 30 * H).toISOString());

  for (const s of sessions ?? []) {
    const startMs = new Date(s.starts_at).getTime();
    const diffH = (startMs - now) / H;

    let stage: "j1" | "h1" | null = null;
    if (diffH <= 26 && diffH >= 22) stage = "j1";       // ~24h avant
    else if (diffH <= 1.5 && diffH >= -0.5) stage = "h1"; // ~1h avant

    if (!stage) continue;

    // Anti-doublon ATOMIQUE : on réserve le créneau via la contrainte unique
    // (session_id, stage) AVANT tout travail. Si l'insert échoue, c'est déjà fait.
    const { error: lockErr } = await admin
      .from("session_reminders").insert({ session_id: s.id, stage });
    if (lockErr) continue;

    // Audience : inscrites du cours, ou toutes les élèves si session globale
    let userIds: string[] = [];
    if (s.course_id) {
      const { data: e } = await admin.from("enrollments").select("user_id").eq("course_id", s.course_id);
      userIds = [...new Set((e ?? []).map((x) => x.user_id))];
    } else {
      const { data: u } = await admin.from("users").select("id").eq("role", "eleve");
      userIds = (u ?? []).map((x) => x.id);
    }

    const quand = stage === "j1" ? "demain" : "dans 1 heure";
    const heure = new Date(s.starts_at).toLocaleString("fr-FR", { hour: "2-digit", minute: "2-digit" });

    // Notifications in-app
    if (userIds.length) {
      await admin.from("notifications").insert(
        userIds.map((uid) => ({
          user_id: uid, type: "session",
          title: `🎥 Session live ${quand} : ${s.titre}`,
          body: `Rendez-vous ${quand} à ${heure}.`,
          link: s.meet_url || "/dashboard/sessions",
        }))
      );
    }

    // Emails (respecte l'opt-out, journalisé)
    const { data: profiles } = await admin.from("users").select("id, nom, email").in("id", userIds.length ? userIds : ["00000000-0000-0000-0000-000000000000"]);
    for (const p of profiles ?? []) {
      const tpl = tplAnnouncement(
        (p.nom || "").split(" ")[0] || "chère élève",
        `Session live ${quand} : ${s.titre}`,
        `Votre atelier en direct a lieu ${quand} à <strong>${heure}</strong>. ${s.meet_url ? `Lien : <a href="${s.meet_url}">${s.meet_url}</a>` : `Rendez-vous sur ${SITE}/dashboard/sessions`}`
      );
      await sendEmail({ userId: p.id, to: p.email, category: "announcements", subject: tpl.subject, html: tpl.html });
    }

    if (stage === "j1") j1++; else h1++;
  }

  return NextResponse.json({ ok: true, sessions: sessions?.length ?? 0, j1_sent: j1, h1_sent: h1 });
}
