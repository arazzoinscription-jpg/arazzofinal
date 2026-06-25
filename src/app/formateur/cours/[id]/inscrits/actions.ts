"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
const Schema = z.object({
  courseId: z.string().uuid(),
  email: z.string().email("Email invalide."),
  nom: z.string().trim().max(120).optional().nullable(),
});

/** Inscrit manuellement une élève à un cours (sans passer par une commande). */
export async function manualEnroll(input: { courseId: string; email: string; nom?: string | null }) {
  const parsed = Schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const { courseId, email, nom } = parsed.data;
  const cleanEmail = email.trim().toLowerCase();

  // Garde : formateur propriétaire du cours, ou admin
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Non authentifié." };
  const { data: prof } = await supabase.from("users").select("role").eq("id", user.id).single();
  const isAdmin = prof?.role === "admin";
  if (prof?.role !== "formateur" && !isAdmin) return { ok: false, error: "Accès refusé." };

  const admin = createAdminClient();
  const { data: course } = await admin
    .from("courses").select("id, titre_fr, formateur_id").eq("id", courseId).maybeSingle();
  if (!course) return { ok: false, error: "Cours introuvable." };
  if (course.formateur_id !== user.id && !isAdmin) return { ok: false, error: "Ce cours ne vous appartient pas." };

  // Trouver ou créer le compte élève
  let studentId: string | null = null;
  const { data: existing } = await admin.from("users").select("id").eq("email", cleanEmail).maybeSingle();
  if (existing) {
    studentId = existing.id;
  } else {
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email: cleanEmail,
      email_confirm: true,
      user_metadata: { nom: nom?.trim() || cleanEmail.split("@")[0] },
    });
    if (createErr || !created?.user) return { ok: false, error: createErr?.message ?? "Création du compte impossible." };
    studentId = created.user.id;
  }
  if (!studentId) return { ok: false, error: "Compte introuvable." };

  // Déjà inscrite ?
  const { data: enr } = await admin
    .from("enrollments").select("id").eq("user_id", studentId).eq("course_id", courseId).maybeSingle();
  if (enr) return { ok: false, error: "Cette élève est déjà inscrite à ce cours." };

  // Inscription (gratuite / manuelle)
  const { error: insErr } = await admin.from("enrollments").insert({
    user_id: studentId, course_id: courseId, amount: 0, currency: "DZD",
    formateur_id: course.formateur_id,
  });
  if (insErr) return { ok: false, error: insErr.message };

  // Notification à l'élève
  try {
    await admin.from("notifications").insert({
      user_id: studentId,
      type: "system",
      title: "🎓 Nouvelle formation accessible",
      body: `Vous avez été inscrite à « ${course.titre_fr} ». Bonne formation !`,
      link: "/dashboard",
    });
  } catch { /* ignore */ }

  revalidatePath(`/formateur/cours/${courseId}/inscrits`);
  revalidatePath("/dashboard");
  return { ok: true };
}

const PackSchema = z.object({
  packId: z.string().uuid(),
  email: z.string().email("Email invalide."),
  nom: z.string().trim().max(120).optional().nullable(),
});

/** Inscrit manuellement une élève à TOUS les cours d'un pack (staff propriétaire du pack ou admin). */
export async function manualEnrollPack(input: { packId: string; email: string; nom?: string | null }) {
  const parsed = PackSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const { packId, email, nom } = parsed.data;
  const cleanEmail = email.trim().toLowerCase();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Non authentifié." };
  const { data: prof } = await supabase.from("users").select("role").eq("id", user.id).single();
  const isAdmin = prof?.role === "admin";
  if (prof?.role !== "formateur" && !isAdmin) return { ok: false, error: "Accès refusé." };

  const admin = createAdminClient();
  const { data: pack } = await admin
    .from("course_packs").select("id, titre_fr, formateur_id").eq("id", packId).maybeSingle();
  if (!pack) return { ok: false, error: "Pack introuvable." };
  if (pack.formateur_id !== user.id && !isAdmin) return { ok: false, error: "Ce pack ne vous appartient pas." };

  const { data: items } = await admin.from("course_pack_items").select("course_id").eq("pack_id", packId);
  const courseIds = [...new Set((items ?? []).map((i) => i.course_id))];
  if (courseIds.length === 0) return { ok: false, error: "Ce pack ne contient aucun cours." };

  // Trouver ou créer le compte élève
  let studentId: string | null = null;
  const { data: existing } = await admin.from("users").select("id").eq("email", cleanEmail).maybeSingle();
  if (existing) {
    studentId = existing.id;
  } else {
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email: cleanEmail, email_confirm: true,
      user_metadata: { nom: nom?.trim() || cleanEmail.split("@")[0] },
    });
    if (createErr || !created?.user) return { ok: false, error: createErr?.message ?? "Création du compte impossible." };
    studentId = created.user.id;
  }
  if (!studentId) return { ok: false, error: "Compte introuvable." };
  const sid: string = studentId;

  // Inscrire à tous les cours du pack non déjà inscrits
  const { data: already } = await admin.from("enrollments").select("course_id").eq("user_id", sid).in("course_id", courseIds);
  const have = new Set((already ?? []).map((e) => e.course_id));
  const toAdd = courseIds.filter((id) => !have.has(id));
  if (toAdd.length === 0) return { ok: false, error: "Cette élève est déjà inscrite à tous les cours du pack." };

  const { error: insErr } = await admin.from("enrollments").insert(
    toAdd.map((cid) => ({ user_id: sid, course_id: cid, amount: 0, currency: "DZD" }))
  );
  if (insErr) return { ok: false, error: insErr.message };

  try {
    await admin.from("notifications").insert({
      user_id: studentId, type: "system", title: "🎁 Pack de formations accessible",
      body: `Vous avez été inscrite au pack « ${pack.titre_fr} » (${toAdd.length} cours). Bonne formation !`,
      link: "/dashboard",
    });
  } catch { /* ignore */ }

  revalidatePath("/formateur/packs");
  revalidatePath("/dashboard");
  return { ok: true, added: toAdd.length };
}

/** Inscrit en une fois plusieurs élèves DÉJÀ existants à TOUS les cours d'un pack. */
export async function bulkEnrollPack(packId: string, userIds: string[]) {
  if (!z.string().uuid().safeParse(packId).success) return { ok: false, error: "Pack invalide." };
  const ids = [...new Set((userIds ?? []).filter((x) => z.string().uuid().safeParse(x).success))];
  if (ids.length === 0) return { ok: false, error: "Aucune élève sélectionnée." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Non authentifié." };
  const { data: prof } = await supabase.from("users").select("role").eq("id", user.id).single();
  const isAdmin = prof?.role === "admin";
  if (prof?.role !== "formateur" && !isAdmin) return { ok: false, error: "Accès refusé." };

  const admin = createAdminClient();
  const { data: pack } = await admin.from("course_packs").select("id, titre_fr, formateur_id").eq("id", packId).maybeSingle();
  if (!pack) return { ok: false, error: "Pack introuvable." };
  if (pack.formateur_id !== user.id && !isAdmin) return { ok: false, error: "Ce pack ne vous appartient pas." };

  const { data: items } = await admin.from("course_pack_items").select("course_id").eq("pack_id", packId);
  const courseIds = [...new Set((items ?? []).map((i) => i.course_id))];
  if (courseIds.length === 0) return { ok: false, error: "Ce pack ne contient aucun cours." };

  // Inscriptions existantes pour ces élèves sur ces cours → on n'ajoute que ce qui manque.
  const { data: already } = await admin
    .from("enrollments").select("user_id, course_id").in("user_id", ids).in("course_id", courseIds);
  const have = new Set((already ?? []).map((e) => `${e.user_id}:${e.course_id}`));

  const toInsert: { user_id: string; course_id: string; amount: number; currency: string }[] = [];
  for (const uid of ids) for (const cid of courseIds) {
    if (!have.has(`${uid}:${cid}`)) toInsert.push({ user_id: uid, course_id: cid, amount: 0, currency: "DZD" });
  }
  if (toInsert.length === 0) return { ok: true, students: 0, enrollments: 0 };

  const { error } = await admin.from("enrollments").insert(toInsert);
  if (error) return { ok: false, error: error.message };

  // Notifications (best-effort) : une par élève réellement ajoutée.
  const newStudents = [...new Set(toInsert.map((r) => r.user_id))];
  try {
    await admin.from("notifications").insert(
      newStudents.map((uid) => ({
        user_id: uid, type: "system", title: "🎁 Pack de formations accessible",
        body: `Vous avez été inscrite au pack « ${pack.titre_fr} ». Bonne formation !`, link: "/dashboard",
      }))
    );
  } catch { /* ignore */ }

  revalidatePath("/formateur/packs");
  revalidatePath("/dashboard");
  return { ok: true, students: newStudents.length, enrollments: toInsert.length };
}

/** Garde : staff propriétaire du cours (ou admin). */
async function requireCourseStaff(courseId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Non authentifié." };
  const { data: prof } = await supabase.from("users").select("role").eq("id", user.id).single();
  const isAdmin = prof?.role === "admin";
  if (prof?.role !== "formateur" && !isAdmin) return { ok: false as const, error: "Accès refusé." };
  const admin = createAdminClient();
  const { data: course } = await admin.from("courses").select("id, titre_fr, formateur_id").eq("id", courseId).maybeSingle();
  if (!course) return { ok: false as const, error: "Cours introuvable." };
  if (course.formateur_id !== user.id && !isAdmin) return { ok: false as const, error: "Ce cours ne vous appartient pas." };
  return { ok: true as const, admin, course };
}

/** Liste des élèves (pour la sélection multiple). */
export async function listStudents(query: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, results: [] as { id: string; nom: string; email: string }[] };
  const { data: prof } = await supabase.from("users").select("role").eq("id", user.id).single();
  if (prof?.role !== "formateur" && prof?.role !== "admin") return { ok: false, results: [] };

  const admin = createAdminClient();
  let q = admin.from("users").select("id, nom, email").eq("role", "eleve").order("nom", { ascending: true }).limit(100);
  const s = (query ?? "").trim();
  if (s.length >= 2) q = q.or(`nom.ilike.%${s}%,email.ilike.%${s}%`);
  const { data } = await q;
  return { ok: true, results: (data ?? []).map((u) => ({ id: u.id, nom: u.nom ?? "Élève", email: u.email ?? "" })) };
}

/** Annule (rejette) l'inscription d'une élève à ce cours. Staff propriétaire ou admin. */
export async function cancelEnrollment(courseId: string, userId: string) {
  if (!z.string().uuid().safeParse(courseId).success || !z.string().uuid().safeParse(userId).success) {
    return { ok: false, error: "Identifiant invalide." };
  }
  const g = await requireCourseStaff(courseId);
  if (!g.ok) return { ok: false, error: g.error };
  const { admin } = g;

  const { error } = await admin.from("enrollments").delete().eq("course_id", courseId).eq("user_id", userId);
  if (error) return { ok: false, error: error.message };

  try {
    await admin.from("notifications").insert({
      user_id: userId, type: "system", title: "Inscription annulée",
      body: `Votre inscription à « ${g.course.titre_fr} » a été annulée par l'équipe pédagogique.`, link: "/dashboard",
    });
  } catch { /* ignore */ }

  revalidatePath(`/formateur/cours/${courseId}/inscrits`);
  revalidatePath("/dashboard");
  return { ok: true };
}

/** Désinscrit en une fois plusieurs élèves sélectionnées de ce cours. */
export async function bulkCancelEnrollment(courseId: string, userIds: string[]) {
  if (!z.string().uuid().safeParse(courseId).success) return { ok: false, error: "Cours invalide." };
  const ids = [...new Set((userIds ?? []).filter((x) => z.string().uuid().safeParse(x).success))];
  if (ids.length === 0) return { ok: false, error: "Aucune élève sélectionnée." };

  const g = await requireCourseStaff(courseId);
  if (!g.ok) return { ok: false, error: g.error };
  const { admin, course } = g;

  const { error } = await admin.from("enrollments").delete().eq("course_id", courseId).in("user_id", ids);
  if (error) return { ok: false, error: error.message };

  // Notifications (best-effort)
  try {
    await admin.from("notifications").insert(
      ids.map((uid) => ({
        user_id: uid, type: "system", title: "Inscription annulée",
        body: `Votre inscription à « ${course.titre_fr} » a été annulée par l'équipe pédagogique.`, link: "/dashboard",
      }))
    );
  } catch { /* ignore */ }

  revalidatePath(`/formateur/cours/${courseId}/inscrits`);
  revalidatePath("/dashboard");
  return { ok: true, removed: ids.length };
}

/**
 * Bloque / met en veille / réactive une élève de ce cours (staff propriétaire ou admin).
 * Limité aux comptes élèves — un formateur ne peut pas viser un autre membre de l'équipe.
 */
export async function setStudentStatus(courseId: string, userId: string, status: "actif" | "veille" | "bloque") {
  if (!z.string().uuid().safeParse(courseId).success || !z.string().uuid().safeParse(userId).success) {
    return { ok: false, error: "Identifiant invalide." };
  }
  if (!["actif", "veille", "bloque"].includes(status)) return { ok: false, error: "Statut invalide." };

  const g = await requireCourseStaff(courseId);
  if (!g.ok) return { ok: false, error: g.error };
  const { admin } = g;

  // La cible doit être inscrite à ce cours et être une élève.
  const { data: enr } = await admin.from("enrollments").select("id").eq("course_id", courseId).eq("user_id", userId).maybeSingle();
  if (!enr) return { ok: false, error: "Cette élève n'est pas inscrite à ce cours." };
  const { data: tu } = await admin.from("users").select("role").eq("id", userId).maybeSingle();
  if (!tu) return { ok: false, error: "Compte introuvable." };
  if (tu.role !== "eleve") return { ok: false, error: "Action réservée aux comptes élèves." };

  const { error } = await admin.auth.admin.updateUserById(userId, {
    ban_duration: status === "actif" ? "none" : "876000h",
    app_metadata: { status },
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/formateur/cours/${courseId}/inscrits`);
  return { ok: true };
}

/** Inscrit en une fois plusieurs élèves sélectionnés à un cours. */
export async function bulkEnroll(courseId: string, userIds: string[]) {
  if (!z.string().uuid().safeParse(courseId).success) return { ok: false, error: "Cours invalide." };
  const ids = [...new Set((userIds ?? []).filter((x) => z.string().uuid().safeParse(x).success))];
  if (ids.length === 0) return { ok: false, error: "Aucune élève sélectionnée." };

  const g = await requireCourseStaff(courseId);
  if (!g.ok) return { ok: false, error: g.error };
  const { admin, course } = g;

  // Déjà inscrites ?
  const { data: existing } = await admin.from("enrollments").select("user_id").eq("course_id", courseId).in("user_id", ids);
  const have = new Set((existing ?? []).map((e) => e.user_id));
  const toAdd = ids.filter((id) => !have.has(id));
  if (toAdd.length === 0) return { ok: true, added: 0 };

  const { error } = await admin.from("enrollments").insert(
    toAdd.map((uid) => ({ user_id: uid, course_id: courseId, amount: 0, currency: "DZD" }))
  );
  if (error) return { ok: false, error: error.message };

  // Notifications (best-effort)
  try {
    await admin.from("notifications").insert(
      toAdd.map((uid) => ({
        user_id: uid, type: "system", title: "🎓 Nouvelle formation accessible",
        body: `Vous avez été inscrite à « ${course.titre_fr} ». Bonne formation !`, link: "/dashboard",
      }))
    );
  } catch { /* ignore */ }

  revalidatePath(`/formateur/cours/${courseId}/inscrits`);
  revalidatePath("/dashboard");
  return { ok: true, added: toAdd.length };
}
