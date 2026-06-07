import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { EnrollForm } from "./enroll-form";

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
    .select("id, paid_at, amount, currency, student:users(nom, email)")
    .eq("course_id", course.id)
    .order("paid_at", { ascending: false });

  const rows = enrolls ?? [];
  const backHref = isAdmin ? "/admin/formations" : "/formateur";

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

      {rows.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-cream-200">
          <div className="text-5xl mb-3">🧵</div>
          <p className="text-gray-400 font-dm">Aucun étudiant inscrit pour le moment.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-cream-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-cream-50">
              <tr className="text-left text-gray-500 font-dm">
                <th className="px-5 py-3 font-medium">Étudiant</th>
                <th className="px-5 py-3 font-medium">Date d'inscription</th>
                <th className="px-5 py-3 font-medium">Montant</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-100">
              {rows.map((e) => {
                const s = e.student as { nom?: string; email?: string } | null;
                return (
                  <tr key={e.id} className="hover:bg-cream-50 font-dm">
                    <td className="px-5 py-3">
                      <div className="font-medium text-gray-900">{s?.nom ?? "—"}</div>
                      <div className="text-xs text-gray-400">{s?.email ?? "—"}</div>
                    </td>
                    <td className="px-5 py-3 text-gray-600">
                      {new Date(e.paid_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                    </td>
                    <td className="px-5 py-3 text-gray-600">
                      {e.currency === "DZD"
                        ? `${Number(e.amount).toLocaleString("fr-DZ")} DA`
                        : `${Number(e.amount).toFixed(0)} €`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
