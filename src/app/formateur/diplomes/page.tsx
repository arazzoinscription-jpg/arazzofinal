import { redirect } from "next/navigation";
import { GraduationCap } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { isFormateur, isAdmin as hasAdminRole } from "@/lib/roles";
import { createAdminClient } from "@/lib/supabase/admin";
import { DiplomaRow, type DiplomaRowData } from "./diploma-row";

export const metadata = { title: "Diplômes — Formateur" };
export const dynamic = "force-dynamic";

export default async function FormateurDiplomesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: prof } = await supabase.from("users").select("role, roles").eq("id", user.id).single();
  const isAdmin = hasAdminRole(prof);
  if (!isFormateur(prof)) redirect("/dashboard");

  const admin = createAdminClient();

  // Cours du formateur (admin voit tout)
  let courseIds: string[] | null = null;
  if (!isAdmin) {
    const { data: myCourses } = await admin.from("courses").select("id").eq("formateur_id", user.id);
    courseIds = (myCourses ?? []).map((c) => c.id);
  }

  let q = admin
    .from("diplomas")
    .select("id, status, full_name, cni_path, diploma_url, course_id, user:users(nom, email), course:courses(titre_fr)")
    .order("updated_at", { ascending: false });
  if (courseIds) q = q.in("course_id", courseIds.length ? courseIds : ["00000000-0000-0000-0000-000000000000"]);
  const { data: rows } = await q;

  const items: DiplomaRowData[] = await Promise.all((rows ?? []).map(async (d: any) => {
    let cniUrl: string | null = null;
    if (d.cni_path) {
      const { data: signed } = await admin.storage.from("proofs").createSignedUrl(d.cni_path, 600);
      cniUrl = signed?.signedUrl ?? null;
    }
    return {
      id: d.id,
      studentName: d.full_name || d.user?.nom || "Élève",
      email: d.user?.email ?? "",
      courseTitre: d.course?.titre_fr ?? "Formation",
      status: d.status,
      cniUrl,
      diplomaUrl: d.diploma_url ?? null,
    };
  }));

  const toReview = items.filter((i) => i.status === "cni_uploaded");
  const others = items.filter((i) => i.status !== "cni_uploaded");

  return (
    <div className="px-1">
      <div className="flex items-center gap-3 mb-6">
        <span className="w-11 h-11 rounded-2xl bg-violet-600/15 text-violet-600 flex items-center justify-center"><GraduationCap size={22} /></span>
        <div>
          <h1 className="font-playfair text-3xl font-bold text-gray-900 dark:text-white">Diplômes</h1>
          <p className="text-gray-500 dark:text-white/50 font-dm text-sm">Vérifiez la CNI puis générez le diplôme officiel (envoi physique).</p>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <div className="text-5xl mb-3">🎓</div>
          <p className="text-gray-400 font-dm">Aucun diplôme en cours. Ils apparaîtront quand vos élèves auront validé assez de travaux pratiques.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {toReview.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-violet-700 mb-2 font-dm">À traiter ({toReview.length})</h2>
              <div className="space-y-3">{toReview.map((d) => <DiplomaRow key={d.id} d={d} />)}</div>
            </section>
          )}
          {others.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-gray-500 mb-2 font-dm">Tous les diplômes</h2>
              <div className="space-y-3">{others.map((d) => <DiplomaRow key={d.id} d={d} />)}</div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
