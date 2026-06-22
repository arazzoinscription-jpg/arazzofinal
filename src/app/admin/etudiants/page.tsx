import { createAdminClient } from "@/lib/supabase/admin";
import { StudentsBulkTable } from "./students-bulk-table";
import { AdminEnrollForm } from "./admin-enroll-form";

export const metadata = { title: "Étudiants inscrits — Admin" };
export const dynamic = "force-dynamic";

const DAY = 1000 * 60 * 60 * 24;

interface CourseEnrollment {
  titre: string;
  paidAt: string;
  formateurNom: string | null;
  formateurEmail: string | null;
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
    .select("paid_at, course_id, course:courses(titre_fr, formateur:users!courses_formateur_id_fkey(nom, email)), student:users!enrollments_user_id_fkey(id, nom, email, role, created_at)")
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
    const courseObj = e.course as {
      titre_fr?: string;
      formateur?: { nom?: string; email?: string } | { nom?: string; email?: string }[] | null;
    } | null;
    const titre = courseObj?.titre_fr;
    // PostgREST renvoie l'embed to-one comme objet, mais le typage peut l'inférer comme tableau
    const formateur = Array.isArray(courseObj?.formateur) ? courseObj?.formateur[0] : courseObj?.formateur;
    if (titre)
      row.courses.push({
        titre,
        paidAt: e.paid_at,
        formateurNom: formateur?.nom ?? null,
        formateurEmail: formateur?.email ?? null,
      });
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

  // Données sérialisées pour le tableau client (sélection multiple + actions groupées)
  const tableRows = rows.map((r) => ({
    id: r.id,
    nom: r.nom,
    email: r.email,
    createdAtText: fmt(r.createdAt),
    courses: r.courses.map((c) => ({
      titre: c.titre,
      dateText: fmt(c.paidAt),
      formateurNom: c.formateurNom,
      formateurEmail: c.formateurEmail,
    })),
    active: r.active,
  }));

  return (
    <div className="px-4 lg:px-8 py-6">
      <h1 className="font-playfair text-3xl font-bold text-gray-900 mb-1">Étudiants inscrits</h1>
      <p className="text-gray-500 mb-6 font-dm">{rows.length} étudiant(s) affiché(s). Cochez pour bloquer, mettre en veille ou supprimer en lot.</p>

      {/* Recherche + filtre par cours */}
      <form className="flex flex-wrap gap-3 mb-6">
        <input name="q" defaultValue={searchParams.q ?? ""} placeholder="Rechercher nom ou email…"
          className="flex-1 min-w-56 border border-gray-100 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-500" />
        <select name="course" defaultValue={courseFilter}
          className="border border-gray-100 rounded-xl px-4 py-2.5 bg-white max-w-xs">
          <option value="">Tous les cours</option>
          {(allCourses ?? []).map((c) => (
            <option key={c.id} value={c.id}>{c.titre_fr}</option>
          ))}
        </select>
        <button className="bg-orange-DEFAULT text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-orange-600">Filtrer</button>
      </form>

      {/* Inscription manuelle (admin) */}
      <AdminEnrollForm courses={(allCourses ?? []).map((c) => ({ id: c.id, titre_fr: c.titre_fr }))} />

      <StudentsBulkTable rows={tableRows} />
    </div>
  );
}
