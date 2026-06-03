import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { QuestionForm } from "./question-form";
import { DeleteQuestionButton } from "./delete-question-button";

export const metadata = { title: "Édition du quiz — Arazzo Formation" };
export const dynamic = "force-dynamic";

const TYPE_LABEL: Record<string, string> = {
  qcm: "QCM", true_false: "Vrai/Faux", number: "Nombre", photo: "Photo",
};

export default async function QuizEditorPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single();
  if (profile?.role !== "formateur" && profile?.role !== "admin") redirect("/dashboard");

  const { data: quiz } = await supabase
    .from("quizzes")
    .select("id, title, type, min_score, max_attempts, time_limit_seconds, lesson:lessons(titre)")
    .eq("id", params.id).single();
  if (!quiz) notFound();

  const { data: questions } = await supabase
    .from("quiz_questions")
    .select("id, question, type, options, correct_answer, explanation, points, order_index")
    .eq("quiz_id", quiz.id)
    .order("order_index", { ascending: true });

  const nextIndex = (questions?.length ?? 0);

  return (
    <div className="max-w-3xl">
      <Link href="/formateur/quiz" className="text-sm text-violet-DEFAULT font-semibold hover:underline">← Tous les quiz</Link>

      <div className="my-4">
        <h1 className="font-playfair text-3xl font-bold text-gray-900">{quiz.title}</h1>
        <p className="text-gray-500 mt-1 font-dm">
          {(quiz.lesson as any)?.titre ?? "—"} · score min {quiz.min_score}% · {quiz.max_attempts} tentative(s)
          {quiz.time_limit_seconds ? ` · ${Math.round(quiz.time_limit_seconds / 60)} min` : ""}
        </p>
      </div>

      {/* Questions existantes */}
      <h2 className="font-playfair text-xl font-bold text-gray-900 mb-3">
        Questions ({questions?.length ?? 0})
      </h2>
      <div className="space-y-3 mb-8">
        {!questions?.length ? (
          <p className="text-gray-400 text-sm font-dm">Aucune question pour le moment.</p>
        ) : questions.map((q, i) => (
          <div key={q.id} className="bg-white rounded-2xl p-4 border border-cream-200">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs bg-violet-50 text-violet-DEFAULT px-2 py-0.5 rounded-full">{TYPE_LABEL[q.type] ?? q.type}</span>
                  <span className="text-xs text-gray-400 font-dm">{q.points} pt</span>
                </div>
                <p className="font-medium text-gray-900 font-dm">{i + 1}. {q.question}</p>
                {Array.isArray(q.options) && q.options.length > 0 && (
                  <ul className="mt-1.5 space-y-0.5">
                    {(q.options as string[]).map((o, j) => (
                      <li key={j} className={`text-sm font-dm ${o === q.correct_answer ? "text-green-600 font-semibold" : "text-gray-500"}`}>
                        {o === q.correct_answer ? "✓ " : "• "}{o}
                      </li>
                    ))}
                  </ul>
                )}
                {q.type !== "qcm" && q.type !== "photo" && q.correct_answer && (
                  <p className="text-sm text-green-600 font-semibold font-dm mt-1">✓ Réponse : {q.correct_answer}</p>
                )}
                {q.explanation && <p className="text-xs text-gray-400 font-dm mt-1 italic">💡 {q.explanation}</p>}
              </div>
              <DeleteQuestionButton id={q.id} quizId={quiz.id} />
            </div>
          </div>
        ))}
      </div>

      <QuestionForm quizId={quiz.id} nextIndex={nextIndex} />
    </div>
  );
}
