import { createAdminClient } from "@/lib/supabase/admin";
import { RequestsManager, type CourseGroup, type ReqRow } from "./requests-manager";

export const metadata = { title: "Demandes d'enrôlement — Admin" };
export const dynamic = "force-dynamic";

export default async function EnrollmentRequestsPage() {
  const admin = createAdminClient();

  const { data: rows } = await admin
    .from("enrollment_requests")
    .select("id, full_name, email, phone, status, created_at, course:courses(id, titre_fr)")
    .order("created_at", { ascending: false })
    .limit(1000);

  // Regroupement par formation + comptage des demandes en attente (mesure d'intérêt).
  const map = new Map<string, CourseGroup>();
  for (const r of rows ?? []) {
    const course = (r as any).course as { id: string; titre_fr: string | null } | null;
    if (!course?.id) continue;
    if (!map.has(course.id)) {
      map.set(course.id, { courseId: course.id, courseTitle: course.titre_fr ?? "Formation", pending: 0, rows: [] });
    }
    const g = map.get(course.id)!;
    const row: ReqRow = {
      id: r.id, full_name: r.full_name, email: r.email, phone: r.phone, status: r.status, created_at: r.created_at,
    };
    g.rows.push(row);
    if (r.status === "pending") g.pending++;
  }

  // Tri : formations les plus demandées d'abord (intérêt).
  const groups = [...map.values()].sort((a, b) => b.pending - a.pending || b.rows.length - a.rows.length);

  const totalPending = groups.reduce((s, g) => s + g.pending, 0);

  return (
    <div className="px-4 lg:px-8 py-6">
      <h1 className="font-playfair text-3xl font-bold text-gray-900 mb-1">Demandes d'enrôlement</h1>
      <p className="text-gray-500 mb-6 font-dm">
        {totalPending} demande(s) en attente sur {groups.length} formation(s). Les formations les plus demandées sont en haut.
        Sélectionnez les personnes puis « Enrôler la sélection » pour les inscrire en masse.
      </p>

      <RequestsManager groups={groups} />
    </div>
  );
}
