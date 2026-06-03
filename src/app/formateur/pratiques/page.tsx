import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ReviewCard, type PracticalRow } from "./review-card";

export const metadata = { title: "Travaux pratiques — Arazzo Formation" };
export const dynamic = "force-dynamic";

export default async function PratiquesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single();
  if (profile?.role !== "formateur" && profile?.role !== "admin") redirect("/dashboard");

  // Soumissions en attente, avec élève + quiz + leçon
  const { data: subs } = await supabase
    .from("practical_submissions")
    .select(`
      id, photo_url, comment, created_at,
      student:users(nom),
      quiz:quizzes(title, lesson:lessons(titre))
    `)
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  const rows: PracticalRow[] = (subs ?? []).map((s: any) => ({
    id: s.id,
    photo_url: s.photo_url,
    comment: s.comment,
    created_at: s.created_at,
    studentName: s.student?.nom ?? "Élève",
    quizTitle: s.quiz?.title ?? "Travail pratique",
    lessonTitle: s.quiz?.lesson?.titre ?? "",
  }));

  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <h1 className="font-playfair text-3xl font-bold text-gray-900">Travaux pratiques</h1>
        <p className="text-gray-500 mt-1 font-dm">
          Validez les réalisations de vos élèves. L'approbation crédite automatiquement +50 XP.
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-cream-200">
          <div className="text-5xl mb-3">🪡</div>
          <p className="text-gray-400 font-dm">Aucun travail en attente de validation.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {rows.map((r) => <ReviewCard key={r.id} row={r} />)}
        </div>
      )}
    </div>
  );
}
