import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { EnrollForm } from "./enroll-form";
import { BulkEnroll } from "./bulk-enroll";
import { EnrolledStudentsTable, type EnrolledRow } from "./enrolled-students-table";

type Status = "actif" | "veille" | "bloque";

export const metadata = { title: "Étudiants inscrits — Arazzo Formation" };
export const dynamic = "force-dynamic";

export default async function CourseEnrolleesPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: prof } = await supabase.from("users").select("role").eq("id", user.id).single();
  const isAdmin = prof?.role === "admin";

  const admin = createAdminClient();
  const { data: course } = await admin
    .from("courses").select("id, titre_fr, formateur_id").eq("id", params.id).single();
  if (!course) notFound();
  if (course.formateur_id !== user.id && !isAdmin) redirect("/formateur");

  // Inscrits à ce cours, du plus récent au plus ancien
  const { data: enrolls } = await admin
    .from("enrollments")
    .select("id, user_id, paid_at, amount, currency, student:users(nom, email)")
    .eq("course_id", course.id)
    .order("paid_at", { ascending: false });

  const rows = enrolls ?? [];
  const enrolledIds = rows.map((e: any) => e.user_id).filter(Boolean);
  const backHref = isAdmin ? "/admin/formations" : "/formateur";

  // Statut de chaque élève (Supabase Auth : ban natif + app_metadata.status)
  const statusById = new Map<string, Status>();
  await Promise.all(enrolledIds.map(async (id: string) => {
    try {
      const { data } = await admin.auth.admin.getUserById(id);
      const m = (data.user?.app_metadata as { status?: string } | undefined)?.status;
      const banned = (data.user as { banned_until?: string } | null)?.banned_until;
      statusById.set(id, m === "veille" || m === "bloque" ? (m as Status) : banned ? "bloque" : "actif");
    } catch { statusById.set(id, "actif"); }
  }));

  return (
    <div className="max-w-4xl">
      <Link href={backHref} className="text-sm text-orange-600 font-semibold hover:underline">← Retour</Link>

      <div className="my-4">
        <h1 className="font-playfair text-3xl font-bold text-gray-900">Étudiants inscrits</h1>
        <p className="text-gray-500 mt-1 font-dm">
          {rows.length} inscrit(s) à « {course.titre_fr} ».
        </p>
      </div>

      <EnrollForm courseId={course.id} />

      <BulkEnroll courseId={course.id} enrolledIds={enrolledIds} />

      {rows.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <div className="text-5xl mb-3">🧵</div>
          <p className="text-gray-400 font-dm">Aucun étudiant inscrit pour le moment.</p>
        </div>
      ) : (
        <EnrolledStudentsTable
          courseId={course.id}
          rows={rows.map((e): EnrolledRow => {
            const s = e.student as { nom?: string; email?: string } | null;
            return {
              id: e.id as string,
              userId: e.user_id as string,
              nom: s?.nom ?? "—",
              email: s?.email ?? "—",
              amount: Number(e.amount),
              currency: e.currency as string,
              paidAt: e.paid_at as string,
              status: statusById.get(e.user_id as string) ?? "actif",
            };
          })}
        />
      )}
    </div>
  );
}
