import { createAdminClient } from "@/lib/supabase/admin";

export const metadata = { title: "Étudiants inscrits — Admin" };
export const dynamic = "force-dynamic";

const DAY = 1000 * 60 * 60 * 24;

interface CourseEnrollment {
  titre: string;
  paidAt: string;
}
interface StudentRow {
  id: string;
  nom: string;
  email: string;
  createdAt: string | null;
  courses: CourseEnrollment[];
  active: boolean;
}

export default async function AdminStudentsPage({
  searchParams,
}: {
  searchParams: { q?: string; course?: string };
}) {
  const admin = createAdminClient();
  const q = (searchParams.q ?? "").trim().toLowerCase();
  const courseFilter = (searchParams.course ?? "").trim();

  // Liste des cours pour le filtre déroulant
  const { data: allCourses } = await admin
    .from("courses")
    .select("id, titre_fr")
    .order("titre_fr", { ascending: true });

  // Inscriptions + étudiant + cours
  const { data: enrolls } = await admin
    .from("enrollments")
    .select("paid_at, course_id, course:courses(titre_fr), student:users(id, nom, email, role, created_at)")
    .order("paid_at", { ascending: false })
    .limit(5000);

  // Étudiants concernés par le filtre cours (si défini)
  const studentsInFilteredCourse = new Set<string>();
  if (courseFilter) {
    (enrolls ?? []).forEach((e) => {
      if (e.course_id === courseFilter) {
        const s = e.student as { id?: string } | null;
        if (s?.id) studentsInFilteredCourse.add(s.id);
      }
    });
  }

  // Regrouper les inscriptions par étudiant (rôle élève uniquement)
  const byStudent = new Map<string, StudentRow>();
  (enrolls ?? []).forEach((e) => {
    const s = e.student as { id?: string; nom?: string; email?: string; role?: string; created_at?: string } | null;
    if (!s?.id || s.role !== "eleve") return;
    if (courseFilter && !studentsInFilteredCourse.has(s.id)) return;

    const row = byStudent.get(s.id) ?? {
      id: s.id,
      nom: s.nom ?? "—",
      email: s.email ?? "—",
      createdAt: s.created_at ?? null,
      courses: [],
      active: false,
    };
    const titre = (e.course as { titre_fr?: string } | null)?.titre_fr;
    if (titre) row.courses.push({ titre, paidAt: e.paid_at });
    byStudent.set(s.id, row);
  });

  // Statut actif / inactif : dernière connexion < 30 jours
  const now = Date.now();
  const lastSignin = new Map<string, string | null>();
  let page = 1;
  while (true) {
    const { data } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (!data || data.users.length === 0) break;
    data.users.forEach((u) => lastSignin.set(u.id, u.last_sign_in_at ?? null));
    if (data.users.length < 1000) break;
    page++;
  }

  let rows = [...byStudent.values()].map((r) => {
    const lsi = lastSignin.get(r.id);
    r.active = lsi ? now - new Date(lsi).getTime() < 30 * DAY : false;
    return r;
  });

  // Recherche nom / email
  if (q) rows = rows.filter((r) => r.nom.toLowerCase().includes(q) || r.email.toLowerCase().includes(q));

  // Tri par date d'inscription plateforme décroissante (plus récents en premier)
  rows.sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime());

  const fmt = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }) : "—";

  return (
    <div className="max-w-6xl mx-auto p-8">
      <h1 className="font-playfair text-3xl font-bold text-gray-900 mb-1">Étudiants inscrits</h1>
      <p className="text-gray-500 mb-6 font-dm">{rows.length} étudiant(s) affiché(s).</p>

      {/* Recherche + filtre par cours */}
      <form className="flex flex-wrap gap-3 mb-6">
        <input name="q" defaultValue={searchParams.q ?? ""} placeholder="Rechercher nom ou email…"
          className="flex-1 min-w-56 border border-cream-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-500" />
        <select name="course" defaultValue={courseFilter}
          className="border border-cream-200 rounded-xl px-4 py-2.5 bg-white max-w-xs">
          <option value="">Tous les cours</option>
          {(allCourses ?? []).map((c) => (
            <option key={c.id} value={c.id}>{c.titre_fr}</option>
          ))}
        </select>
        <button className="bg-orange-DEFAULT text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-orange-600">Filtrer</button>
      </form>

      <div className="bg-white rounded-2xl border border-cream-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-cream-50">
            <tr className="text-left text-gray-500 font-dm">
              <th className="px-5 py-3 font-medium">Étudiant</th>
              <th className="px-5 py-3 font-medium">Inscrit le</th>
              <th className="px-5 py-3 font-medium">Cours suivis</th>
              <th className="px-5 py-3 font-medium">Statut</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-cream-100">
            {rows.length === 0 ? (
              <tr><td colSpan={4} className="text-center py-10 text-gray-400">Aucun étudiant.</td></tr>
            ) : rows.map((r) => (
              <tr key={r.id} className="hover:bg-cream-50 font-dm align-top">
                <td className="px-5 py-3">
                  <div className="font-medium text-gray-900">{r.nom}</div>
                  <div className="text-xs text-gray-400">{r.email}</div>
                </td>
                <td className="px-5 py-3 text-gray-600 whitespace-nowrap">{fmt(r.createdAt)}</td>
                <td className="px-5 py-3">
                  <ul className="space-y-1">
                    {r.courses.map((c, i) => (
                      <li key={i} className="text-gray-600">
                        <span className="text-gray-800">{c.titre}</span>
                        <span className="text-xs text-gray-400"> · {fmt(c.paidAt)}</span>
                      </li>
                    ))}
                  </ul>
                </td>
                <td className="px-5 py-3">
                  <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${
                    r.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                  }`}>
                    {r.active ? "● Actif" : "○ Inactif"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
