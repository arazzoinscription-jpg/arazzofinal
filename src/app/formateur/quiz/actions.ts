"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isFormateur } from "@/lib/roles";

async function requireStaff() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, ok: false };
  const { data: p } = await supabase.from("users").select("role, roles").eq("id", user.id).single();
  return { supabase, user, ok: isFormateur(p) };
}

const QuizSchema = z.object({
  lesson_id: z.string().uuid(),
  title: z.string().min(2),
  type: z.enum(["lesson_end", "module_end", "timed", "practical"]),
  min_score: z.number().int().min(0).max(100),
  time_limit_seconds: z.number().int().positive().nullable().optional(),
  max_attempts: z.number().int().positive(),
});

export async function createQuiz(input: z.infer<typeof QuizSchema>) {
  const parsed = QuizSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const { supabase, ok } = await requireStaff();
  if (!ok) return { ok: false, error: "Accès refusé." };
  const { data, error } = await supabase.from("quizzes").insert(parsed.data).select("id").single();
  if (error) return { ok: false, error: error.message };
  revalidatePath("/formateur/quiz");
  return { ok: true, id: data.id };
}

export async function deleteQuiz(id: string) {
  const { supabase, ok } = await requireStaff();
  if (!ok) return { ok: false, error: "Accès refusé." };
  const { error } = await supabase.from("quizzes").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/formateur/quiz");
  return { ok: true };
}

const QuestionSchema = z.object({
  quiz_id: z.string().uuid(),
  question: z.string().min(2),
  type: z.enum(["qcm", "true_false", "number", "photo"]),
  options: z.array(z.string()).nullable().optional(),
  correct_answer: z.string().nullable().optional(),
  explanation: z.string().nullable().optional(),
  points: z.number().int().positive(),
  order_index: z.number().int().min(0),
});

export async function addQuestion(input: z.infer<typeof QuestionSchema>) {
  const parsed = QuestionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const { supabase, ok } = await requireStaff();
  if (!ok) return { ok: false, error: "Accès refusé." };
  const d = parsed.data;
  const { error } = await supabase.from("quiz_questions").insert({
    quiz_id: d.quiz_id, question: d.question, type: d.type,
    options: d.options ?? null, correct_answer: d.correct_answer ?? null,
    explanation: d.explanation ?? null, points: d.points, order_index: d.order_index,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/formateur/quiz/${d.quiz_id}`);
  return { ok: true };
}

export async function deleteQuestion(id: string, quizId: string) {
  const { supabase, ok } = await requireStaff();
  if (!ok) return { ok: false, error: "Accès refusé." };
  const { error } = await supabase.from("quiz_questions").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/formateur/quiz/${quizId}`);
  return { ok: true };
}

// ── Révision des travaux pratiques ──
const ReviewSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["approved", "rejected"]),
  feedback: z.string().max(2000).nullable().optional(),
});

/** Approuve ou rejette une soumission pratique. L'approbation déclenche +50 XP (trigger). */
export async function reviewPractical(input: z.infer<typeof ReviewSchema>) {
  const parsed = ReviewSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const { supabase, user, ok } = await requireStaff();
  if (!ok || !user) return { ok: false, error: "Accès refusé." };
  const { error } = await supabase
    .from("practical_submissions")
    .update({
      status: parsed.data.status,
      feedback: parsed.data.feedback ?? null,
      reviewed_at: new Date().toISOString(),
      reviewed_by: user.id,
    })
    .eq("id", parsed.data.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/formateur/pratiques");
  return { ok: true };
}
