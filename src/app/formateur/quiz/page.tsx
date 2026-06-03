import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { QuizCreateForm } from "./quiz-create-form";

export const metadata = { title: "Quiz — Arazzo Formation" };
export const dynamic = "force-dynamic";

const TYPE_LABEL: Record<string, string> = {
  lesson_end: "Fin de leçon", module_end: "Fin de module", timed: "Chronométré", practical: "Pratique 📷",
};

export default async function FormateurQuizPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Leçons des cours du formateur (pour le sélecteur)
  const { data: courses } = await supabase
    .from("courses").select("titre_fr, chapters(lessons(id, titre))").eq("formateur_id", user!.id).limit(80);
  const lessons: { id: string; label: string }[] = [];
  (courses ?? []).forEach((c: any) => (c.chapters ?? []).forEach((ch: any) => (ch.lessons ?? []).forEach((l: any) =>
    lessons.push({ id: l.id, label: `${c.titre_fr.slice(0, 25)} · ${l.titre.slice(0, 40)}` }))));

  const { data: quizzes } = await supabase
    .from("quizzes")
    .select("id, title, type, min_score, lesson:lessons(titre), quiz_questions(id)")
    .order("created_at", { ascending: false }).limit(100);

  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <h1 className="font-playfair text-3xl font-bold text-gray-900">Quiz</h1>
        <p className="text-gray-500 mt-1 font-dm">Créez des quiz à la fin de vos leçons (XP + badges automatiques).</p>
      </div>

      <QuizCreateForm lessons={lessons} />

      <h2 className="font-playfair text-xl font-bold text-gray-900 mt-10 mb-4">Mes quiz ({quizzes?.length ?? 0})</h2>
      <div className="space-y-3">
        {!quizzes?.length ? (
          <p className="text-gray-400 text-sm font-dm">Aucun quiz pour le moment.</p>
        ) : quizzes.map((q) => (
          <Link key={q.id} href={`/formateur/quiz/${q.id}`}
            className="block bg-white rounded-2xl p-4 border border-cream-200 hover:shadow-lg hover:border-violet-200 transition-all">
            <div className="flex items-center justify-between gap-3">
              <span className="font-semibold text-gray-900 font-dm">{q.title}</span>
              <span className="text-xs bg-violet-50 text-violet-DEFAULT px-2.5 py-0.5 rounded-full flex-shrink-0">{TYPE_LABEL[q.type] ?? q.type}</span>
            </div>
            <p className="text-xs text-gray-400 font-dm mt-1">
              {(q.lesson as any)?.titre?.slice(0, 50) ?? "—"} · {(q.quiz_questions as any[])?.length ?? 0} questions · score min {q.min_score}%
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
