import { createAdminClient } from "@/lib/supabase/admin";
import { StudentsBulkTable } from "./students-bulk-table";
import { AdminEnrollForm } from "./admin-enroll-form";

export const metadata = { title: "Étudiants inscrits — Admin" };
export const dynamic = "force-dynamic";

const DAY = 1000 * 60 * 60 * 24;

const LEVEL_1_SLUG = "niveau-1-bases-vetements-quotidiens";
const LEVEL_2_SLUG = "niveau-2-classique-soiree";

// IDs TutorLMS d'origine pour chaque niveau (permet de reconnaître les modules même sans titre "المحور N")
const LEVEL_1_MODULE_IDS = new Set([6630, 3185, 3145, 6618, 3177, 3167, 3173, 3179, 3175]);
const LEVEL_2_MODULE_IDS = new Set([6547, 5179, 5190]);

interface StudentRow {
  id: string;
  nom: string;
  email: string;
  dateInscription: string | null;
  hasLevel1: boolean;
  hasLevel2: boolean;
  otherCourses: Set<string>;
  formateurNom: string | null;
  formateurEmail: string | null;
  active: boolean;
}

function parseModuleNum(title: string | null): number | null {
  const m = String(title || "").match(/المحور\s*(\d+)/i);
  return m ? parseInt(m[1], 10) : null;
}

function parseTrailingId(slug: string | null | undefined): number | null {
  const m = String(slug || "").match(/-(\d+)$/);
  return m ? parseInt(m[1], 10) : null;
}

function getModuleNum(title: string | null, slug: string | null | undefined): number | null {
  const fromTitle = parseModuleNum(title);
  if (fromTitle) return fromTitle;
  const tid = parseTrailingId(slug);
  if (!tid) return null;
  if (LEVEL_1_MODULE_IDS.has(tid)) {
    // On renvoie un numéro fictif dans la plage 1-9 pour déclencher NIVEAU 1
    return 1;
  }
  if (LEVEL_2_MODULE_IDS.has(tid)) {
    // Numéro fictif dans la plage 10-12 pour déclencher NIVEAU 2
    return 10;
  }
  return null;
}

export default async function AdminStudentsPage({
  searchParams,
}: {
  searchParams: { q?: string; course?: string };
}) {
  const admin = createAdminClient();
  const q = (searchParams.q ?? "").trim().toLowerCase();
  const courseFilter = (searchParams.course ?? "").trim();

  // ── 1) Cours : niveaux + modules ──────────────────────────────────────────
  const { data: allCourses } = await admin
    .from("courses")
    .select("id, titre_fr, slug, formateur_id, formateur:users!courses_formateur_id_fkey(nom, email)")
    .order("titre_fr", { ascending: true });

  const level1 = (allCourses ?? []).find((c) => c.slug === LEVEL_1_SLUG);
  const level2 = (allCourses ?? []).find((c) => c.slug === LEVEL_2_SLUG);

  const moduleCourseIds = (allCourses ?? [])
    .filter((c) => {
      const num = getModuleNum(c.titre_fr, c.slug);
      return num && num >= 1 && num <= 12;
    })
    .map((c) => c.id);

  // ── 2) Inscriptions + étudiant + cours ────────────────────────────────────
  const { data: enrolls } = await admin
    .from("enrollments")
    .select("paid_at, course_id, course:courses(titre_fr, slug, formateur:users!courses_formateur_id_fkey(nom, email)), student:users!enrollments_user_id_fkey(id, nom, email, role, created_at)")
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

  // ── 3) Regrouper par étudiant et déduire NIVEAU 1 / NIVEAU 2 ──────────────
  const byStudent = new Map<string, StudentRow>();
  (enrolls ?? []).forEach((e) => {
    const s = e.student as { id?: string; nom?: string; email?: string; role?: string; created_at?: string } | null;
    if (!s?.id || s.role !== "eleve") return;
    if (courseFilter && !studentsInFilteredCourse.has(s.id)) return;

    const courseObj = e.course as {
      titre_fr?: string;
      slug?: string;
      formateur?: { nom?: string; email?: string } | { nom?: string; email?: string }[] | null;
    } | null;
    const slug = courseObj?.slug;
    const titre = courseObj?.titre_fr;
    const formateur = Array.isArray(courseObj?.formateur) ? courseObj?.formateur[0] : courseObj?.formateur;
    const formateurNom = formateur?.nom ?? null;
    const formateurEmail = formateur?.email ?? null;

    const isLevel1 = slug === LEVEL_1_SLUG;
    const isLevel2 = slug === LEVEL_2_SLUG;
    const moduleNum = getModuleNum(titre ?? null, slug);
    const isModule = moduleNum !== null && moduleNum >= 1 && moduleNum <= 12;

    const row = byStudent.get(s.id) ?? {
      id: s.id,
      nom: s.nom ?? "—",
      email: s.email ?? "—",
      dateInscription: null,
      hasLevel1: false,
      hasLevel2: false,
      otherCourses: new Set<string>(),
      formateurNom: null,
      formateurEmail: null,
      active: false,
    };

    // Date d'inscription = la plus ancienne date rencontrée
    if (e.paid_at) {
      if (!row.dateInscription || new Date(e.paid_at) < new Date(row.dateInscription)) {
        row.dateInscription = e.paid_at;
      }
    }

    // Déduire les niveaux depuis les modules 1-12
    if (isLevel1 || (isModule && moduleNum! >= 1 && moduleNum! <= 9)) row.hasLevel1 = true;
    if (isLevel2 || (isModule && moduleNum! >= 10 && moduleNum! <= 12)) row.hasLevel2 = true;

    // Conserver le nom des cours qui ne sont pas des modules 1-12
    if (titre && !isLevel1 && !isLevel2 && !isModule) {
      row.otherCourses.add(titre);
    }

    // Formateur : privilégier celui du cours-niveau, sinon le premier trouvé
    if ((isLevel1 || isLevel2) && formateurNom) {
      row.formateurNom = formateurNom;
      row.formateurEmail = formateurEmail;
    } else if (!row.formateurNom && formateurNom) {
      row.formateurNom = formateurNom;
      row.formateurEmail = formateurEmail;
    }

    byStudent.set(s.id, row);
  });

  // ── 4) Statut actif / inactif : dernière connexion < 30 jours ─────────────
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

  // ── 4 bis) Statut du lien d'accès envoyé (access_links) par étudiant ───────
  // none = jamais envoyé · valid = envoyé et encore valable · used = déjà utilisé · expired = expiré
  type AccessStatus = "none" | "valid" | "used" | "expired";
  const accessByUser = new Map<string, AccessStatus>();
  const studentIds = rows.map((r) => r.id);
  if (studentIds.length) {
    const { data: links } = await admin
      .from("access_links")
      .select("user_id, expires_at, used_at, created_at")
      .in("user_id", studentIds)
      .order("created_at", { ascending: false });
    // On ne garde que le lien le plus récent par utilisateur (déjà trié desc).
    for (const l of links ?? []) {
      if (accessByUser.has(l.user_id)) continue;
      const expired = new Date(l.expires_at).getTime() < now;
      accessByUser.set(l.user_id, expired ? "expired" : l.used_at ? "used" : "valid");
    }
  }

  // Recherche nom / email / formation
  if (q) {
    rows = rows.filter((r) => {
      const levels = [r.hasLevel1 ? "NIVEAU 1" : "", r.hasLevel2 ? "NIVEAU 2" : ""].filter(Boolean).join(", ");
      const courses = Array.from(r.otherCourses).join(", ");
      const formationText = [levels, courses].filter(Boolean).join(", ").toLowerCase();
      return (
        r.nom.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q) ||
        formationText.includes(q)
      );
    });
  }

  // Tri par date d'inscription décroissante (plus récents en premier)
  rows.sort((a, b) => new Date(b.dateInscription ?? 0).getTime() - new Date(a.dateInscription ?? 0).getTime());

  const fmt = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }) : "—";

  const tableRows = rows.map((r) => {
    const formationParts: string[] = [];
    if (r.hasLevel1) formationParts.push("NIVEAU 1");
    if (r.hasLevel2) formationParts.push("NIVEAU 2");
    formationParts.push(...Array.from(r.otherCourses));
    return {
      id: r.id,
      nom: r.nom,
      email: r.email,
      dateInscriptionText: fmt(r.dateInscription),
      dateInscriptionIso: r.dateInscription,
      formation: formationParts.join(", ") || "—",
      formateurNom: r.formateurNom,
      formateurEmail: r.formateurEmail,
      active: r.active,
      accessStatus: accessByUser.get(r.id) ?? "none",
    };
  });

  return (
    <div className="px-4 lg:px-8 py-6">
      <h1 className="font-playfair text-3xl font-bold text-gray-900 mb-1">Étudiants inscrits</h1>
      <p className="text-gray-500 mb-6 font-dm">{rows.length} étudiant(s) affiché(s). Cochez pour bloquer, mettre en veille ou supprimer en lot.</p>

      {/* Recherche + filtre par cours */}
      <form className="flex flex-wrap gap-3 mb-6">
        <input name="q" defaultValue={searchParams.q ?? ""} placeholder="Rechercher nom, email ou formation…"
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
