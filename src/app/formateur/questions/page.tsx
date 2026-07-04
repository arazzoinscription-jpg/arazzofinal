import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { QuestionsClient, type QRow, type QReply } from "./questions-client";

export const metadata = { title: "Questions des élèves — Arazzo Formation" };
export const dynamic = "force-dynamic";

function chunk<T>(a: T[], n: number): T[][] { const o: T[][] = []; for (let i = 0; i < a.length; i += n) o.push(a.slice(i, i + n)); return o; }

export default async function FormateurQuestionsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: prof } = await supabase.from("users").select("role").eq("id", user.id).single();
  if (prof?.role !== "formateur" && prof?.role !== "admin") redirect("/dashboard");
  const isAdmin = prof?.role === "admin";

  const admin = createAdminClient();

  // ── Leçons du formateur (cours → chapitres → leçons) ──
  let cq = admin.from("courses").select("id, titre_fr");
  if (!isAdmin) cq = cq.eq("formateur_id", user.id);
  const { data: courses } = await cq;
  const courseTitle = new Map<string, string>((courses ?? []).map((c: { id: string; titre_fr: string | null }) => [c.id, c.titre_fr ?? "Formation"]));
  const courseIds = [...courseTitle.keys()];

  const lessonTitleById = new Map<string, string>();
  const courseTitleByLesson = new Map<string, string>();
  const lessonIds: string[] = [];
  if (courseIds.length) {
    const { data: chapters } = await admin.from("chapters").select("id, course_id").in("course_id", courseIds);
    const chapterCourse = new Map<string, string>((chapters ?? []).map((c: { id: string; course_id: string }) => [c.id, c.course_id]));
    const chapterIds = [...chapterCourse.keys()];
    for (const part of chunk(chapterIds, 300)) {
      const { data: lessons } = await admin.from("lessons").select("id, titre, chapter_id").in("chapter_id", part);
      for (const l of (lessons ?? []) as { id: string; titre: string | null; chapter_id: string }[]) {
        lessonIds.push(l.id);
        lessonTitleById.set(l.id, l.titre ?? "Leçon");
        const cid = chapterCourse.get(l.chapter_id);
        if (cid) courseTitleByLesson.set(l.id, courseTitle.get(cid) ?? "");
      }
    }
  }

  // ── Questions + réponses sur ces leçons ──
  type Raw = { id: string; lesson_id: string; user_id: string; parent_id: string | null; content: string; created_at: string; author: { nom: string | null; role: string | null }[] | { nom: string | null; role: string | null } | null };
  const all: Raw[] = [];
  for (const part of chunk(lessonIds, 200)) {
    const { data } = await admin
      .from("lesson_questions")
      .select("id, lesson_id, user_id, parent_id, content, created_at, author:users(nom, role)")
      .in("lesson_id", part)
      .order("created_at", { ascending: true })
      .limit(1000);
    (data ?? []).forEach((q) => all.push(q as Raw));
  }

  const authorOf = (r: Raw) => (Array.isArray(r.author) ? r.author[0] : r.author) ?? null;
  const repliesByParent = new Map<string, QReply[]>();
  for (const r of all) {
    if (!r.parent_id) continue;
    const a = authorOf(r);
    const list = repliesByParent.get(r.parent_id) ?? [];
    list.push({ id: r.id, authorName: a?.nom ?? "Utilisateur", authorRole: a?.role ?? "eleve", content: r.content, created_at: r.created_at });
    repliesByParent.set(r.parent_id, list);
  }

  const rows: QRow[] = all
    .filter((r) => !r.parent_id)
    .map((r) => {
      const a = authorOf(r);
      const replies = repliesByParent.get(r.id) ?? [];
      const answered = replies.some((rep) => rep.authorRole === "formateur" || rep.authorRole === "admin");
      return {
        id: r.id, lessonId: r.lesson_id,
        studentName: a?.nom ?? "Élève",
        lessonTitle: lessonTitleById.get(r.lesson_id) ?? "Leçon",
        courseTitle: courseTitleByLesson.get(r.lesson_id) ?? "",
        content: r.content, created_at: r.created_at, replies, answered,
      };
    })
    // Non répondues d'abord, puis les plus récentes.
    .sort((x, y) => (Number(x.answered) - Number(y.answered)) || y.created_at.localeCompare(x.created_at));

  const pending = rows.filter((r) => !r.answered).length;

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="font-playfair text-3xl font-bold text-gray-900 dark:text-white">Questions des élèves</h1>
        <p className="text-gray-500 dark:text-white/50 mt-1 font-dm">
          Répondez directement aux questions posées sous vos leçons.{pending > 0 ? ` ${pending} en attente.` : ""}
        </p>
      </div>
      <QuestionsClient rows={rows} />
    </div>
  );
}
