import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://www.formation-arazzo.store";

/**
 * Digest « fin de journée » par formateur : signale par email les travaux
 * pratiques à corriger et les questions d'élèves restées sans réponse.
 * Déclenché par le dispatcher cron du soir (nightly).
 */
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const admin = createAdminClient();

  // 1) Travaux pratiques non encore approuvés.
  const { data: practicals } = await admin
    .from("lesson_practicals").select("lesson_id").neq("status", "approved");
  // 2) Questions de niveau racine sans aucune réponse (pas d'enfant parent_id=id).
  const { data: questions } = await admin
    .from("lesson_questions").select("id, lesson_id, parent_id");
  const replied = new Set((questions ?? []).filter((q) => q.parent_id).map((q) => q.parent_id as string));
  const openQuestions = (questions ?? []).filter((q) => !q.parent_id && !replied.has(q.id as string));

  const lessonIds = [...new Set([
    ...(practicals ?? []).map((p) => p.lesson_id as string),
    ...openQuestions.map((q) => q.lesson_id as string),
  ].filter(Boolean))];
  if (!lessonIds.length) return NextResponse.json({ ok: true, sent: 0 });

  // Mapping leçon → cours → formateur.
  const { data: lessons } = await admin.from("lessons").select("id, chapter_id").in("id", lessonIds);
  const chapterIds = [...new Set((lessons ?? []).map((l) => l.chapter_id as string).filter(Boolean))];
  const { data: chapters } = chapterIds.length
    ? await admin.from("chapters").select("id, course_id").in("id", chapterIds)
    : { data: [] as any[] };
  const chCourse = new Map((chapters ?? []).map((c: any) => [c.id, c.course_id]));
  const lessonCourse = new Map((lessons ?? []).map((l: any) => [l.id, chCourse.get(l.chapter_id)]));
  const courseIds = [...new Set([...lessonCourse.values()].filter(Boolean))] as string[];
  const { data: courses } = courseIds.length
    ? await admin.from("courses").select("id, formateur_id").in("id", courseIds)
    : { data: [] as any[] };
  const courseFormateur = new Map((courses ?? []).map((c: any) => [c.id, c.formateur_id]));
  const formateurOf = (lessonId: string) => courseFormateur.get(lessonCourse.get(lessonId) ?? "") as string | undefined;

  // Comptage par formateur.
  const counts = new Map<string, { practicals: number; questions: number }>();
  const bump = (f: string | undefined, key: "practicals" | "questions") => {
    if (!f) return;
    const c = counts.get(f) ?? { practicals: 0, questions: 0 };
    c[key]++; counts.set(f, c);
  };
  for (const p of practicals ?? []) bump(formateurOf(p.lesson_id as string), "practicals");
  for (const q of openQuestions) bump(formateurOf(q.lesson_id as string), "questions");

  const formateurIds = [...counts.keys()];
  if (!formateurIds.length) return NextResponse.json({ ok: true, sent: 0 });
  const { data: users } = await admin.from("users").select("id, nom, email").in("id", formateurIds);

  let sent = 0;
  for (const u of users ?? []) {
    const c = counts.get(u.id);
    if (!c || (!c.practicals && !c.questions) || !u.email) continue;
    const prenom = (u.nom ?? "").split(" ")[0] || "";
    const rows: string[] = [];
    if (c.practicals) rows.push(`<tr><td style="padding:6px 0">🧵 Travaux pratiques à corriger</td><td style="padding:6px 0;font-weight:700;text-align:right">${c.practicals}</td></tr>`);
    if (c.questions) rows.push(`<tr><td style="padding:6px 0">💬 Questions sans réponse</td><td style="padding:6px 0;font-weight:700;text-align:right">${c.questions}</td></tr>`);
    const html = `<div style="font-family:system-ui,Arial,sans-serif;max-width:520px;color:#111827">
      <h2 style="color:#5B16F9;margin:0 0 8px">Votre récap du jour${prenom ? `, ${prenom}` : ""}</h2>
      <p style="margin:0 0 12px">Voici ce qui attend votre attention :</p>
      <table style="width:100%;border-collapse:collapse;font-size:15px">${rows.join("")}</table>
      <p style="margin:18px 0 0">
        <a href="${SITE}/formateur/pratiques" style="display:inline-block;background:#FE7223;color:#fff;text-decoration:none;font-weight:700;padding:10px 18px;border-radius:10px">Corriger les pratiques</a>
      </p>
      <p style="color:#9ca3af;font-size:12px;margin-top:18px">Arazzo Formation — récap automatique</p>
    </div>`;
    await sendEmail({ to: u.email, userId: u.id, category: "teacher_reply", force: true, subject: "Arazzo — votre récap du jour", html });
    sent++;
  }

  return NextResponse.json({ ok: true, sent });
}
