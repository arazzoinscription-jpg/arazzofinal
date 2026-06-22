import Link from "next/link";
import { redirect } from "next/navigation";
import { MessageCircle, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata = { title: "Mes questions — Arazzo Formation" };
export const dynamic = "force-dynamic";

export default async function MyQuestionsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/dashboard/questions");

  const admin = createAdminClient();
  // Questions posées par l'élève + réponses reçues sur ses propres questions.
  const { data: mine } = await admin
    .from("lesson_questions")
    .select("id, lesson_id, content, created_at, parent_id, lesson:lessons(titre, chapter:chapters(course:courses(titre_fr)))")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const myThreadIds = (mine ?? []).filter((q) => !q.parent_id).map((q) => q.id);
  const { data: replies } = myThreadIds.length
    ? await admin
        .from("lesson_questions")
        .select("id, parent_id, content, created_at, author:users(nom, role)")
        .in("parent_id", myThreadIds)
        .neq("user_id", user.id)
    : { data: [] as any[] };

  const repliesByParent = new Map<string, { count: number; lastFrom: string }>();
  for (const r of replies ?? []) {
    const cur = repliesByParent.get(r.parent_id as string) ?? { count: 0, lastFrom: "" };
    cur.count += 1;
    cur.lastFrom = (r.author as { nom?: string } | null)?.nom ?? "Formatrice";
    repliesByParent.set(r.parent_id as string, cur);
  }

  const threads = (mine ?? []).filter((q: any) => !q.parent_id).map((q: any) => ({
    id: q.id,
    lessonId: q.lesson_id,
    lessonTitre: q.lesson?.titre ?? "Leçon",
    courseTitre: q.lesson?.chapter?.course?.titre_fr ?? "",
    content: q.content,
    created_at: q.created_at,
    reply: repliesByParent.get(q.id),
  }));

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-3 mb-2">
        <span className="w-11 h-11 rounded-2xl bg-violet-600/15 text-violet-600 flex items-center justify-center"><MessageCircle size={22} /></span>
        <div>
          <h1 className="font-playfair text-3xl font-bold text-gray-900 dark:text-white">Mes questions</h1>
          <p className="text-gray-500 dark:text-white/50 font-dm text-sm">Vos questions posées aux formatrices, toutes formations confondues.</p>
        </div>
      </div>

      {threads.length === 0 ? (
        <div className="mt-8 text-center py-16 bg-white dark:bg-white/[0.04] rounded-2xl border border-cream-200 dark:border-white/10">
          <div className="text-5xl mb-3">💬</div>
          <p className="text-gray-400 font-dm">Vous n'avez pas encore posé de question. Vous pouvez en poser une depuis n'importe quelle leçon.</p>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {threads.map((t) => (
            <Link key={t.id} href={`/dashboard/cours/${t.lessonId}`}
              className="block bg-white dark:bg-white/[0.04] rounded-2xl border border-cream-200 dark:border-white/10 p-5 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 dark:text-white truncate">{t.lessonTitre}</p>
                  {t.courseTitre && <p className="text-xs text-gray-400 truncate">{t.courseTitre}</p>}
                </div>
                {t.reply && (
                  <span className="flex-shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-green-50 text-green-700">
                    {t.reply.count} réponse{t.reply.count > 1 ? "s" : ""}
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600 dark:text-white/70 mb-2 line-clamp-2">{t.content}</p>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">{new Date(t.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</span>
                <span className="inline-flex items-center gap-1 text-sm font-semibold text-violet-600">Voir / répondre <ArrowRight size={14} /></span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
