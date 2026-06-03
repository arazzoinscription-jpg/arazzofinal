"use server";

import { z } from "zod";
import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export interface QuizCorrection {
  questionId: string;
  isCorrect: boolean;
  correctAnswer: string | null;
  explanation: string | null;
}
export interface QuizResult {
  ok: boolean;
  error?: string;
  score?: number;
  passed?: boolean;
  attemptNumber?: number;
  attemptsLeft?: number;
  corrections?: QuizCorrection[];
}

/** Normalise une réponse pour comparaison robuste. */
function norm(v: unknown): string {
  return String(v ?? "").trim().toLowerCase();
}
function answersEqual(type: string, given: unknown, correct: string | null): boolean {
  if (correct == null) return false;
  if (type === "number") {
    const a = parseFloat(String(given).replace(",", "."));
    const b = parseFloat(String(correct).replace(",", "."));
    return !isNaN(a) && !isNaN(b) && a === b;
  }
  return norm(given) === norm(correct);
}

const SubmitSchema = z.object({
  quizId: z.string().uuid(),
  answers: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])),
  timeSpentSeconds: z.number().int().min(0).optional(),
});

/**
 * Soumet une tentative de quiz. Le calcul du score est fait côté serveur
 * (les bonnes réponses ne transitent jamais avant la soumission).
 * L'insertion déclenche le trigger gamification (XP + badges).
 */
export async function submitQuizAttempt(
  quizId: string,
  answers: Record<string, string | number | boolean>,
  timeSpentSeconds?: number
): Promise<QuizResult> {
  const parsed = SubmitSchema.safeParse({ quizId, answers, timeSpentSeconds });
  if (!parsed.success) return { ok: false, error: "Données invalides." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Non authentifié." };

  const admin = createAdminClient();

  const { data: quiz } = await admin
    .from("quizzes").select("id, min_score, max_attempts").eq("id", quizId).single();
  if (!quiz) return { ok: false, error: "Quiz introuvable." };

  // Limite de tentatives
  const { count: prev } = await admin
    .from("quiz_attempts").select("*", { count: "exact", head: true })
    .eq("student_id", user.id).eq("quiz_id", quizId);
  const attemptNumber = (prev ?? 0) + 1;
  if (quiz.max_attempts && attemptNumber > quiz.max_attempts) {
    return { ok: false, error: "Vous avez épuisé vos tentatives pour ce quiz." };
  }

  // Questions + bonnes réponses (serveur uniquement)
  const { data: questions } = await admin
    .from("quiz_questions").select("id, type, correct_answer, explanation, points").eq("quiz_id", quizId);

  let earned = 0, total = 0;
  const corrections: QuizCorrection[] = [];
  for (const q of questions ?? []) {
    total += q.points;
    const ok = answersEqual(q.type, answers[q.id], q.correct_answer);
    if (ok) earned += q.points;
    corrections.push({ questionId: q.id, isCorrect: ok, correctAnswer: q.correct_answer, explanation: q.explanation });
  }
  const score = total > 0 ? Math.round((earned / total) * 100) : 0;
  const passed = score >= quiz.min_score;

  const { error } = await admin.from("quiz_attempts").insert({
    quiz_id: quizId, student_id: user.id, answers,
    score, passed, attempt_number: attemptNumber, time_spent_seconds: timeSpentSeconds ?? null,
  });
  if (error) return { ok: false, error: error.message };

  return {
    ok: true, score, passed, attemptNumber,
    attemptsLeft: Math.max(0, (quiz.max_attempts ?? 0) - attemptNumber),
    corrections,
  };
}

/**
 * Soumet une photo pour un quiz pratique → Supabase Storage + ligne en attente.
 * (Reçoit un FormData : file + comment + quizId.)
 */
export async function submitPracticalPhoto(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Non authentifié." };

  const quizId = String(formData.get("quizId") || "");
  const comment = String(formData.get("comment") || "");
  const file = formData.get("file") as File | null;
  if (!quizId || !file) return { ok: false, error: "Photo requise." };
  if (file.size > 10 * 1024 * 1024) return { ok: false, error: "Photo trop lourde (max 10 Mo)." };

  const admin = createAdminClient();
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const path = `${user.id}/${quizId}-${randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: upErr } = await admin.storage.from("practicals").upload(path, buffer, {
    contentType: file.type || "image/jpeg", upsert: false,
  });
  if (upErr) return { ok: false, error: "Envoi échoué : " + upErr.message };

  const { data: pub } = admin.storage.from("practicals").getPublicUrl(path);

  const { error } = await admin.from("practical_submissions").insert({
    quiz_id: quizId, student_id: user.id, photo_url: pub.publicUrl, comment, status: "pending",
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/dashboard/quiz/${quizId}`);
  return { ok: true };
}
