import { createAdminClient } from "@/lib/supabase/admin";
import { GestionClient } from "./gestion-client";

export const metadata = { title: "Gestion Formateurs & Étudiants — Admin" };
export const dynamic = "force-dynamic";

export default async function AdminGestionPage({
  searchParams,
}: {
  searchParams: { tab?: string; formateur?: string; formation?: string; status?: string; q?: string };
}) {
  const admin = createAdminClient();

  // ── 1) Utilisateurs ───────────────────────────────────────────────────────
  const { data: users } = await admin
    .from("users")
    .select("id, nom, email, role, avatar_url, bio, ville, created_at")
    .in("role", ["formateur", "eleve"]);

  const formateurs = (users ?? []).filter((u) => u.role === "formateur");
  const eleves = (users ?? []).filter((u) => u.role === "eleve");

  // ── 2) Cours et inscriptions ──────────────────────────────────────────────
  const { data: courses } = await admin
    .from("courses")
    .select("id, titre_fr, formateur_id")
    .order("titre_fr", { ascending: true });

  const { data: enrollments } = await admin
    .from("enrollments")
    .select("id, user_id, course_id, paid_at, formateur_id, course:courses!enrollments_course_id_fkey(titre_fr, formateur_id), student:users!enrollments_user_id_fkey(nom, email)")
    .order("paid_at", { ascending: false })
    .limit(5000);

  // ── 3) Statuts et dernière connexion (auth) ───────────────────────────────
  const lastSignin = new Map<string, string | null>();
  const statusById = new Map<string, "actif" | "inactif" | "veille" | "bloque">();
  let page = 1;
  while (true) {
    const { data } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (!data || data.users.length === 0) break;
    for (const u of data.users) {
      lastSignin.set(u.id, u.last_sign_in_at ?? null);
      const meta = (u.app_metadata as { status?: string } | undefined)?.status;
      const banned = (u as { banned_until?: string }).banned_until;
      if (meta === "veille" || meta === "bloque") statusById.set(u.id, meta as "veille" | "bloque");
      else if (banned) statusById.set(u.id, "bloque");
      else statusById.set(u.id, u.last_sign_in_at ? "actif" : "inactif");
    }
    if (data.users.length < 1000) break;
    page++;
  }

  // ── 4) Comptes par formateur ──────────────────────────────────────────────
  const courseFormateur = new Map((courses ?? []).map((c) => [c.id, c.formateur_id]));
  const coursesByFormateur = new Map<string, number>();
  const studentsByFormateur = new Map<string, Set<string>>();
  for (const f of formateurs) {
    coursesByFormateur.set(f.id, 0);
    studentsByFormateur.set(f.id, new Set());
  }
  for (const c of courses ?? []) {
    if (c.formateur_id) {
      coursesByFormateur.set(c.formateur_id, (coursesByFormateur.get(c.formateur_id) ?? 0) + 1);
    }
  }
  for (const e of enrollments ?? []) {
    const cid = e.course_id;
    const fid = e.formateur_id ?? courseFormateur.get(cid) ?? null;
    if (fid) {
      const set = studentsByFormateur.get(fid);
      if (set) set.add(e.user_id);
    }
  }

  // ── 5) Stats globales ─────────────────────────────────────────────────────
  let activeCount = 0;
  let inactiveCount = 0;
  let veilleCount = 0;
  let bloqueCount = 0;
  for (const e of eleves) {
    const s = statusById.get(e.id) ?? "inactif";
    if (s === "actif") activeCount++;
    else if (s === "veille") veilleCount++;
    else if (s === "bloque") bloqueCount++;
    else inactiveCount++;
  }

  const stats = {
    totalFormateurs: formateurs.length,
    totalEleves: eleves.length,
    actifs: activeCount,
    inactifs: inactiveCount,
    veille: veilleCount,
    bloques: bloqueCount,
  };

  return (
    <GestionClient
      initialTab={searchParams.tab ?? "formateurs"}
      formateurs={formateurs.map((f) => ({
        id: f.id,
        nom: f.nom ?? "—",
        email: f.email ?? "—",
        avatar_url: f.avatar_url,
        bio: f.bio,
        ville: f.ville,
        coursCount: coursesByFormateur.get(f.id) ?? 0,
        elevesCount: (studentsByFormateur.get(f.id) ?? new Set()).size,
        status: statusById.get(f.id) ?? "actif",
      }))}
      eleves={eleves.map((e) => ({
        id: e.id,
        nom: e.nom ?? "—",
        email: e.email ?? "—",
        avatar_url: e.avatar_url,
        status: statusById.get(e.id) ?? "inactif",
        lastSignInAt: lastSignin.get(e.id) ?? null,
      }))}
      courses={courses ?? []}
      enrollments={(enrollments ?? []).map((e) => ({
        id: e.id as string,
        user_id: e.user_id as string,
        course_id: e.course_id as string,
        formateur_id: (e.formateur_id ?? courseFormateur.get(e.course_id) ?? null) as string | null,
        paid_at: e.paid_at as string | null,
        course_titre: ((e.course as { titre_fr?: string } | null)?.titre_fr) ?? "—",
        student_nom: ((e.student as { nom?: string } | null)?.nom) ?? "—",
        student_email: ((e.student as { email?: string } | null)?.email) ?? "—",
      }))}
      stats={stats}
      initialFilters={{
        formateur: searchParams.formateur ?? "",
        formation: searchParams.formation ?? "",
        status: searchParams.status ?? "",
        q: searchParams.q ?? "",
      }}
    />
  );
}
