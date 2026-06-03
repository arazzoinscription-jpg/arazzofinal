import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { QuizPlayer, type PlayerQuestion } from "@/components/quiz/QuizPlayer";
import { PracticalSubmission, type ExistingSubmission } from "@/components/quiz/PracticalSubmission";

export const metadata = { title: "Quiz — Arazzo Formation" };
export const dynamic = "force-dynamic";

export default async function QuizPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Quiz (RLS : lisible si inscrite au cours)
  const { data: quiz } = await supabase
    .from("quizzes")
    .select("id, title, type, min_score, time_limit_seconds, max_attempts, lesson_id, lesson:lessons(titre)")
    .eq("id", params.id).single();
  if (!quiz) notFound();

  return (
    <div>
      <div className="mb-6">
        <p className="text-sm text-gray-400 font-dm">{(quiz.lesson as any)?.titre ?? "Quiz"}</p>
        <h1 className="font-playfair text-2xl font-bold text-gray-900">{quiz.title}</h1>
      </div>

      {quiz.type === "practical" ? (
        <PracticalView quizId={quiz.id} userId={user.id} />
      ) : (
        <QuizView quiz={quiz} userId={user.id} />
      )}
    </div>
  );
}

// ─── Quiz classique ─────────────────────────────────────────────────────────
async function QuizView({ quiz, userId }: { quiz: any; userId: string }) {
  const supabase = await createClient();

  // Questions SANS la bonne réponse (le scoring se fait côté serveur)
  const { data: questions } = await supabase
    .from("quiz_questions")
    .select("id, question, type, options, points, order_index")
    .eq("quiz_id", quiz.id)
    .order("order_index", { ascending: true });

  const { count: attemptsUsed } = await supabase
    .from("quiz_attempts").select("*", { count: "exact", head: true })
    .eq("student_id", userId).eq("quiz_id", quiz.id);

  if (!questions?.length) {
    return <p className="text-gray-400 font-dm">Ce quiz n'a pas encore de questions.</p>;
  }
  if ((attemptsUsed ?? 0) >= quiz.max_attempts) {
    return (
      <div className="bg-white rounded-2xl border border-cream-200 p-8 text-center text-gray-500 font-dm">
        Vous avez épuisé vos {quiz.max_attempts} tentative(s) pour ce quiz.
      </div>
    );
  }

  return (
    <QuizPlayer
      quizId={quiz.id}
      title={quiz.title}
      minScore={quiz.min_score}
      timeLimitSeconds={quiz.time_limit_seconds}
      maxAttempts={quiz.max_attempts}
      attemptsUsed={attemptsUsed ?? 0}
      questions={(questions as PlayerQuestion[])}
    />
  );
}

// ─── Quiz pratique (photo) ──────────────────────────────────────────────────
async function PracticalView({ quizId, userId }: { quizId: string; userId: string }) {
  const supabase = await createClient();
  const { data: sub } = await supabase
    .from("practical_submissions")
    .select("status, photo_url, comment, feedback, reviewed_at")
    .eq("quiz_id", quizId).eq("student_id", userId)
    .order("created_at", { ascending: false }).limit(1).maybeSingle();

  return (
    <div className="max-w-xl">
      <p className="text-gray-600 font-dm mb-4">
        Réalisez l'exercice puis envoyez une photo de votre travail. Votre formatrice le validera (+50 XP).
      </p>
      <PracticalSubmission quizId={quizId} existing={(sub as ExistingSubmission) ?? null} />
    </div>
  );
}
