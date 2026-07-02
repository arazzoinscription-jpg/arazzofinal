import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";

export const metadata = { title: "Étudiants inscrits — Arazzo Formation" };
export const dynamic = "force-dynamic";

interface StudentAgg {
  user_id: string;
  nom: string;
  email: string;
  ville: string | null;
  courses: Set<string>;
  count: number;
  lastAt: string | null;
}

export default async function FormateurStudentsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: prof } = await supabase.from("users").select("role").eq("id", user.id).single();
  if (prof?.role !== "formateur" && prof?.role !== "admin") redirect("/dashboard");
  const isAdmin = prof?.role === "admin";

  const admin = createAdminClient();

  // Cours du formateur (tous si admin).
  let coursesQ = admin.from("courses").select("id, titre_fr");
  if (!isAdmin) coursesQ = coursesQ.eq("formateur_id", user.id);
  const { data: courses } = await coursesQ;
  const courseIds = (courses ?? []).map((c: { id: string }) => c.id);

  const agg = new Map<string, StudentAgg>();
  if (courseIds.length) {
    const { data: enr } = await admin
      .from("enrollments")
      .select("user_id, paid_at, course:courses(titre_fr), student:users!enrollments_user_id_fkey(nom, email, ville)")
      .in("course_id", courseIds)
      .order("paid_at", { ascending: false });

    for (const e of (enr ?? []) as any[]) {
      if (!e.user_id) continue;
      const s = Array.isArray(e.student) ? e.student[0] : e.student;
      const c = Array.isArray(e.course) ? e.course[0] : e.course;
      const cur = agg.get(e.user_id) ?? {
        user_id: e.user_id,
        nom: s?.nom ?? "Étudiant",
        email: s?.email ?? "",
        ville: s?.ville ?? null,
        courses: new Set<string>(),
        count: 0,
        lastAt: null,
      };
      if (c?.titre_fr) cur.courses.add(c.titre_fr);
      cur.count += 1;
      if (!cur.lastAt || (e.paid_at && new Date(e.paid_at) > new Date(cur.lastAt))) cur.lastAt = e.paid_at ?? cur.lastAt;
      agg.set(e.user_id, cur);
    }
  }

  const rows = [...agg.values()].sort((a, b) => (b.lastAt ?? "").localeCompare(a.lastAt ?? ""));

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <h1 className="font-playfair text-3xl font-bold text-gray-900 dark:text-white">Étudiants inscrits</h1>
        <p className="text-gray-500 dark:text-white/50 mt-1 font-dm">
          {rows.length} étudiant(s) inscrit(s) à {isAdmin ? "l'ensemble des formations" : "vos formations"}.
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-white/[0.04] rounded-2xl border border-cream-200 dark:border-white/10">
          <div className="text-5xl mb-3">🧵</div>
          <p className="text-gray-400 font-dm">Aucun étudiant inscrit pour le moment.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-white/[0.04] rounded-2xl border border-cream-200 dark:border-white/10 overflow-hidden">
          <div className="overflow-x-auto">
            <Table className="w-full text-sm">
              <TableHeader className="bg-gray-50 dark:bg-white/5">
                <TableRow className="text-left text-gray-500 font-dm">
                  <TableHead className="px-5 py-3 font-medium">Étudiant</TableHead>
                  <TableHead className="px-5 py-3 font-medium">Ville</TableHead>
                  <TableHead className="px-5 py-3 font-medium">Formations</TableHead>
                  <TableHead className="px-5 py-3 font-medium">Dernière inscription</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-gray-50 dark:divide-white/5">
                {rows.map((r) => (
                  <TableRow key={r.user_id} className="hover:bg-gray-50 dark:hover:bg-white/5 font-dm align-top">
                    <TableCell className="px-5 py-3">
                      <div className="font-medium text-gray-900 dark:text-white">{r.nom}</div>
                      <div className="text-xs text-gray-400">{r.email}</div>
                    </TableCell>
                    <TableCell className="px-5 py-3 text-gray-500">{r.ville ?? "—"}</TableCell>
                    <TableCell className="px-5 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        {[...r.courses].map((t) => (
                          <span key={t} className="text-[11px] px-2 py-0.5 rounded-full bg-orange-50 text-orange-700">{t}</span>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="px-5 py-3 text-gray-400 whitespace-nowrap">
                      {r.lastAt ? new Date(r.lastAt).toLocaleDateString("fr-FR") : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}
