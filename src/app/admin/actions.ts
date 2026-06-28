"use server";

import { z } from "zod";
import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { activateAndInvite } from "@/lib/account-access";

function slugify(s: string): string {
  const base = s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 50);
  return `${base || "formation"}-${randomUUID().slice(0, 6)}`;
}

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, admin: null };
  const { data: prof } = await supabase.from("users").select("role").eq("id", user.id).single();
  return { ok: prof?.role === "admin", admin: createAdminClient(), userId: user.id };
}

const RoleSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(["eleve", "formateur", "patronniste", "admin"]),
});

export async function changeUserRole(input: z.infer<typeof RoleSchema>) {
  const parsed = RoleSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Données invalides." };
  const { ok, admin, userId } = await requireAdmin();
  if (!ok || !admin) return { ok: false, error: "Accès refusé." };
  // Empêcher de se rétrograder soi-même
  if (parsed.data.userId === userId && parsed.data.role !== "admin") {
    return { ok: false, error: "Vous ne pouvez pas changer votre propre rôle." };
  }
  const { error } = await admin.from("users").update({ role: parsed.data.role }).eq("id", parsed.data.userId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/utilisateurs");
  return { ok: true };
}

const StatusSchema = z.object({
  userId: z.string().uuid(),
  status: z.enum(["actif", "veille", "bloque"]),
});

/**
 * Change le statut d'un compte (réservé à l'admin) :
 * - "bloque"  : blocage définitif — connexion impossible.
 * - "veille"  : mise en veille — compte suspendu temporairement, connexion impossible.
 * - "actif"   : réactivation.
 * Appliqué via Supabase Auth (ban natif) + métadonnées `app_metadata.status`.
 */
export async function setUserStatus(input: z.infer<typeof StatusSchema>) {
  const parsed = StatusSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Données invalides." };
  const { ok, admin, userId } = await requireAdmin();
  if (!ok || !admin) return { ok: false, error: "Accès refusé." };

  const { userId: target, status } = parsed.data;
  if (target === userId) return { ok: false, error: "Vous ne pouvez pas vous appliquer ce statut à vous-même." };

  // On ne bloque pas un autre administrateur.
  const { data: t } = await admin.from("users").select("role").eq("id", target).maybeSingle();
  if (!t) return { ok: false, error: "Compte introuvable." };
  if (t.role === "admin") return { ok: false, error: "Impossible d'appliquer ce statut à un administrateur." };

  const { error } = await admin.auth.admin.updateUserById(target, {
    ban_duration: status === "actif" ? "none" : "876000h",
    app_metadata: { status },
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/utilisateurs");
  revalidatePath("/admin/etudiants");
  revalidatePath("/admin/formateurs");
  return { ok: true };
}

const BulkStatusSchema = z.object({
  userIds: z.array(z.string().uuid()).min(1).max(500),
  status: z.enum(["actif", "veille", "bloque"]),
});

/** Applique un statut (actif / veille / bloqué) à plusieurs comptes ÉLÈVES (admin). */
export async function bulkSetUserStatus(input: z.infer<typeof BulkStatusSchema>) {
  const parsed = BulkStatusSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Données invalides." };
  const { ok, admin, userId } = await requireAdmin();
  if (!ok || !admin) return { ok: false, error: "Accès refusé." };

  const ids = [...new Set(parsed.data.userIds)].filter((id) => id !== userId);
  // Sécurité : on ne vise QUE des comptes élèves (jamais admins/formateurs).
  const { data: targets } = await admin.from("users").select("id, role").in("id", ids);
  const eleveIds = (targets ?? []).filter((u) => u.role === "eleve").map((u) => u.id);
  if (eleveIds.length === 0) return { ok: false, error: "Aucun élève sélectionné." };

  const ban = parsed.data.status === "actif" ? "none" : "876000h";
  let count = 0;
  for (const id of eleveIds) {
    const { error } = await admin.auth.admin.updateUserById(id, {
      ban_duration: ban, app_metadata: { status: parsed.data.status },
    });
    if (!error) count++;
  }
  revalidatePath("/admin/etudiants");
  revalidatePath("/admin/utilisateurs");
  return { ok: true, count };
}

/** Supprime définitivement plusieurs comptes ÉLÈVES (admin). Action irréversible. */
export async function bulkDeleteUsers(userIds: string[]) {
  const idsOk = z.array(z.string().uuid()).min(1).max(500).safeParse(userIds);
  if (!idsOk.success) return { ok: false, error: "Données invalides." };
  const { ok, admin, userId } = await requireAdmin();
  if (!ok || !admin) return { ok: false, error: "Accès refusé." };

  const ids = [...new Set(idsOk.data)].filter((id) => id !== userId);
  const { data: targets } = await admin.from("users").select("id, role").in("id", ids);
  const eleveIds = (targets ?? []).filter((u) => u.role === "eleve").map((u) => u.id);
  if (eleveIds.length === 0) return { ok: false, error: "Aucun élève sélectionné." };

  let count = 0;
  for (const id of eleveIds) {
    const { error } = await admin.auth.admin.deleteUser(id);
    if (!error) count++;
  }
  revalidatePath("/admin/etudiants");
  revalidatePath("/admin/utilisateurs");
  return { ok: true, count };
}

/**
 * Active des comptes élèves migrés + envoie le lien de création de mot de passe.
 * Réservé à l'ADMIN (validation d'identité). Plafonné à 20 par appel (délai serveur).
 */
export async function bulkActivateAndInvite(userIds: string[]) {
  const idsOk = z.array(z.string().uuid()).min(1).max(500).safeParse(userIds);
  if (!idsOk.success) return { ok: false, error: "Données invalides." };
  const { ok, admin } = await requireAdmin();
  if (!ok || !admin) return { ok: false, error: "Accès refusé." };

  const all = [...new Set(idsOk.data)];
  const ids = all.slice(0, 20);
  let sent = 0;
  let firstError: string | undefined;
  for (const id of ids) {
    const r = await activateAndInvite(admin, id);
    if (r.ok) sent++;
    else if (!firstError) firstError = r.error;
  }
  revalidatePath("/admin/etudiants");
  revalidatePath("/admin/utilisateurs");
  return { ok: true, sent, remaining: all.length - ids.length, error: sent === 0 ? firstError : undefined };
}

/** Affecte (ou retire) le formateur d'un cours. Réservé à l'admin. */
export async function assignCourseFormateur(courseId: string, formateurId: string | null) {
  const idOk = z.string().uuid().safeParse(courseId);
  if (!idOk.success) return { ok: false, error: "Formation invalide." };
  const { ok, admin } = await requireAdmin();
  if (!ok || !admin) return { ok: false, error: "Accès refusé." };

  if (formateurId) {
    if (!z.string().uuid().safeParse(formateurId).success) return { ok: false, error: "Formateur invalide." };
    const { data: f } = await admin.from("users").select("role").eq("id", formateurId).maybeSingle();
    if (!f || (f.role !== "formateur" && f.role !== "admin")) {
      return { ok: false, error: "Ce compte n'est pas formateur." };
    }
  }

  const { error } = await admin.from("courses").update({ formateur_id: formateurId }).eq("id", idOk.data);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/formations");
  revalidatePath("/formateur/cours");
  return { ok: true };
}

/** Publie / dépublie un pack de cours (catalogue admin). Réservé à l'admin. */
export async function togglePackPublish(packId: string, published: boolean) {
  const idOk = z.string().uuid().safeParse(packId);
  if (!idOk.success) return { ok: false, error: "Pack invalide." };
  const { ok, admin } = await requireAdmin();
  if (!ok || !admin) return { ok: false, error: "Accès refusé." };
  const { error } = await admin.from("course_packs").update({ published }).eq("id", idOk.data);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/packs");
  revalidatePath("/formateur/packs");
  revalidatePath("/boutique");
  return { ok: true };
}

/** Active/désactive le mode abonnement (paiement par tranches) d'un pack. Admin. */
export async function setPackSubscription(input: { packId: string; enabled: boolean; durationMonths: number | null }) {
  const Schema = z.object({
    packId: z.string().uuid(),
    enabled: z.boolean(),
    durationMonths: z.number().int().min(2).max(24).nullable(),
  });
  const parsed = Schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const { packId, enabled, durationMonths } = parsed.data;
  if (enabled && (!durationMonths || durationMonths < 2)) {
    return { ok: false, error: "Indiquez une durée d'au moins 2 mois." };
  }
  const { ok, admin } = await requireAdmin();
  if (!ok || !admin) return { ok: false, error: "Accès refusé." };
  const { error } = await admin
    .from("course_packs")
    .update({ subscription_enabled: enabled, duration_months: enabled ? durationMonths : null })
    .eq("id", packId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/formations");
  revalidatePath("/admin/packs");
  revalidatePath("/offre");
  return { ok: true };
}

export async function toggleCoursePublish(courseId: string, published: boolean) {
  const { ok, admin } = await requireAdmin();
  if (!ok || !admin) return { ok: false, error: "Accès refusé." };
  const { error } = await admin.from("courses").update({ published }).eq("id", courseId);
  if (error) return { ok: false, error: error.message };
  // Revalider le cache ISR des pages publiques
  revalidatePath("/admin/formations");
  revalidatePath("/");
  revalidatePath("/formations");
  return { ok: true };
}

export async function toggleCourseVisibleInscription(courseId: string, visible: boolean) {
  const idOk = z.string().uuid().safeParse(courseId);
  if (!idOk.success) return { ok: false, error: "Formation invalide." };
  const { ok, admin } = await requireAdmin();
  if (!ok || !admin) return { ok: false, error: "Accès refusé." };
  const { error } = await admin.from("courses").update({ visible_inscription: visible }).eq("id", idOk.data);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/formations");
  revalidatePath("/offre");
  revalidatePath("/formations");
  return { ok: true };
}

const SubscriptionSchema = z.object({
  courseId: z.string().uuid("Formation invalide."),
  enabled: z.boolean(),
  durationMonths: z.number().int().min(2).max(24).nullable(),
});

/**
 * Active/désactive le « mode abonnement » d'une formation (paiement par tranches
 * + ouverture progressive des chapitres). Réservé à l'admin. Si activé, une durée
 * en mois (≥ 2) est requise : elle sert à découper les chapitres et calculer les
 * tranches mensuelles.
 */
export async function setCourseSubscription(input: z.infer<typeof SubscriptionSchema>) {
  const parsed = SubscriptionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const { courseId, enabled, durationMonths } = parsed.data;
  if (enabled && (!durationMonths || durationMonths < 2)) {
    return { ok: false, error: "Indiquez une durée d'au moins 2 mois." };
  }
  const { ok, admin } = await requireAdmin();
  if (!ok || !admin) return { ok: false, error: "Accès refusé." };

  const { error } = await admin
    .from("courses")
    .update({ subscription_enabled: enabled, duration_months: enabled ? durationMonths : null })
    .eq("id", courseId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/formations");
  revalidatePath("/offre");
  return { ok: true };
}

/**
 * Met une formation EN VENTE (crée/réactive le produit boutique lié) ou la retire.
 * RÉSERVÉ À L'ADMIN : le formateur publie le cours, l'admin accorde la mise en vente.
 */
export async function setCourseSale(courseId: string, onSale: boolean) {
  const idOk = z.string().uuid().safeParse(courseId);
  if (!idOk.success) return { ok: false, error: "Formation invalide." };
  const { ok, admin } = await requireAdmin();
  if (!ok || !admin) return { ok: false, error: "Accès refusé." };

  const { data: course } = await admin
    .from("courses").select("id, titre_fr, description_fr, prix_dzd, thumbnail, published").eq("id", courseId).single();
  if (!course) return { ok: false, error: "Formation introuvable." };
  if (onSale && !course.published) {
    return { ok: false, error: "Publiez d'abord la formation avant de la mettre en vente." };
  }

  const { data: existing } = await admin.from("products").select("id").eq("course_id", courseId).maybeSingle();

  if (onSale) {
    const row = {
      title: course.titre_fr ?? "Formation",
      description: course.description_fr ?? null,
      type: "course" as const,
      price: course.prix_dzd ?? 0,
      images: course.thumbnail ? [course.thumbnail] : [],
      course_id: courseId,
      is_active: true,
    };
    const { error } = existing
      ? await admin.from("products").update(row).eq("id", existing.id)
      : await admin.from("products").insert({ ...row, slug: slugify(row.title) });
    if (error) return { ok: false, error: error.message };
  } else if (existing) {
    const { error } = await admin.from("products").update({ is_active: false }).eq("id", existing.id);
    if (error) return { ok: false, error: error.message };
  }

  revalidatePath("/admin/formations");
  revalidatePath("/boutique");
  revalidatePath("/formations");
  return { ok: true };
}

/**
 * Met un PATRON en vente (crée/réactive le produit boutique lié) ou le retire.
 * RÉSERVÉ À L'ADMIN : le patronniste publie le patron, l'admin accorde la mise en vente.
 */
export async function setPatronSale(patronId: string, onSale: boolean) {
  const idOk = z.string().uuid().safeParse(patronId);
  if (!idOk.success) return { ok: false, error: "Patron invalide." };
  const { ok, admin } = await requireAdmin();
  if (!ok || !admin) return { ok: false, error: "Accès refusé." };

  const { data: patron } = await admin
    .from("patrons").select("id, titre, description, prix_dzd, preview_url, fichier_url").eq("id", patronId).single();
  if (!patron) return { ok: false, error: "Patron introuvable." };

  const { data: existing } = await admin.from("products").select("id").eq("patron_id", patronId).maybeSingle();

  if (onSale) {
    const row = {
      title: patron.titre ?? "Patron",
      description: patron.description ?? null,
      type: "patron_pdf" as const,
      price: patron.prix_dzd ?? 0,
      images: patron.preview_url ? [patron.preview_url] : [],
      files: patron.fichier_url ? [patron.fichier_url] : [],
      patron_id: patronId,
      is_active: true,
    };
    const { error } = existing
      ? await admin.from("products").update(row).eq("id", existing.id)
      : await admin.from("products").insert({ ...row, slug: slugify(row.title) });
    if (error) return { ok: false, error: error.message };
  } else if (existing) {
    const { error } = await admin.from("products").update({ is_active: false }).eq("id", existing.id);
    if (error) return { ok: false, error: error.message };
  }

  revalidatePath("/admin/patrons");
  revalidatePath("/boutique");
  revalidatePath("/patrons");
  return { ok: true };
}

/** Rembourse une inscription : trace le paiement + remboursement et révoque l'accès. */
export async function refundEnrollment(enrollmentId: string, reason: string) {
  const { ok, admin } = await requireAdmin();
  if (!ok || !admin) return { ok: false, error: "Accès refusé." };

  const { data: enr } = await admin
    .from("enrollments").select("user_id, course_id, amount, currency").eq("id", enrollmentId).single();
  if (!enr) return { ok: false, error: "Inscription introuvable." };

  const { data: pay } = await admin.from("payments").insert({
    user_id: enr.user_id, course_id: enr.course_id, amount: enr.amount,
    currency: enr.currency, provider: "chargily", status: "refunded",
  }).select().single();

  if (pay) await admin.from("refunds").insert({ payment_id: pay.id, amount: enr.amount, reason: reason || "Remboursement admin" });

  await admin.from("enrollments").delete().eq("id", enrollmentId);
  await admin.from("notifications").insert({
    user_id: enr.user_id, type: "system", title: "💸 Remboursement effectué",
    body: "Votre paiement a été remboursé et l'accès au cours a été retiré.", link: "/dashboard",
  });

  revalidatePath("/admin/paiements");
  return { ok: true };
}

/** Supprime une inscription sans remboursement (réservé à l'admin). */
export async function deleteEnrollment(enrollmentId: string) {
  const idOk = z.string().uuid().safeParse(enrollmentId);
  if (!idOk.success) return { ok: false, error: "Inscription invalide." };
  const { ok, admin } = await requireAdmin();
  if (!ok || !admin) return { ok: false, error: "Accès refusé." };

  const { data: enr } = await admin
    .from("enrollments")
    .select("user_id, course_id, course:courses(titre_fr)")
    .eq("id", idOk.data)
    .maybeSingle();
  if (!enr) return { ok: false, error: "Inscription introuvable." };

  const { error } = await admin.from("enrollments").delete().eq("id", idOk.data);
  if (error) return { ok: false, error: error.message };

  const courseTitle = (enr.course as { titre_fr?: string } | null)?.titre_fr ?? "la formation";
  await admin.from("notifications").insert({
    user_id: enr.user_id,
    type: "system",
    title: "❌ Inscription annulée",
    body: `Votre inscription à « ${courseTitle} » a été annulée par l'administration.`,
    link: "/dashboard",
  });

  revalidatePath("/admin/gestion");
  revalidatePath("/admin/etudiants");
  revalidatePath("/formateur/cours");
  return { ok: true };
}

/**
 * Annule TOUTES les inscriptions d'un élève (retire l'accès aux cours) sans
 * supprimer son compte. Réservé à l'admin. Utilisé par le bouton « Annuler
 * l'inscription » de la liste des étudiants inscrits.
 */
export async function cancelStudentEnrollments(userId: string) {
  const idOk = z.string().uuid().safeParse(userId);
  if (!idOk.success) return { ok: false, error: "Utilisateur invalide." };
  const { ok, admin } = await requireAdmin();
  if (!ok || !admin) return { ok: false, error: "Accès refusé." };

  const { data: u } = await admin.from("users").select("role").eq("id", idOk.data).maybeSingle();
  if (!u) return { ok: false, error: "Utilisateur introuvable." };
  if (u.role !== "eleve") return { ok: false, error: "Cet utilisateur n'est pas un élève." };

  const { data: enrs } = await admin.from("enrollments").select("id").eq("user_id", idOk.data);
  const count = enrs?.length ?? 0;
  if (count === 0) return { ok: true, count: 0 };

  const { error } = await admin.from("enrollments").delete().eq("user_id", idOk.data);
  if (error) return { ok: false, error: error.message };

  await admin.from("notifications").insert({
    user_id: idOk.data,
    type: "system",
    title: "❌ Inscription annulée",
    body: "Toutes vos inscriptions ont été annulées par l'administration. Contactez-nous pour toute question.",
    link: "/dashboard",
  });

  revalidatePath("/admin/etudiants");
  revalidatePath("/admin/gestion");
  return { ok: true, count };
}

/** Renvoie l'email d'accès à un élève (active + invite). Réservé à l'admin. */
export async function resendStudentAccess(userId: string) {
  const idOk = z.string().uuid().safeParse(userId);
  if (!idOk.success) return { ok: false, error: "Utilisateur invalide." };
  const { ok, admin } = await requireAdmin();
  if (!ok || !admin) return { ok: false, error: "Accès refusé." };

  const { data: u } = await admin.from("users").select("role, nom").eq("id", idOk.data).maybeSingle();
  if (!u) return { ok: false, error: "Utilisateur introuvable." };
  if (u.role !== "eleve") return { ok: false, error: "Cet utilisateur n'est pas un élève." };

  const r = await activateAndInvite(admin, idOk.data);
  if (!r.ok) return { ok: false, error: r.error ?? "Envoi impossible." };

  revalidatePath("/admin/gestion");
  revalidatePath("/admin/etudiants");
  return { ok: true };
}

// ════════════════════════════════════════════════════════════════════════
// Demandes d'enrôlement (migration 042) — enrôlement en masse depuis les leads
// ════════════════════════════════════════════════════════════════════════

/**
 * Enrôle en masse les demandes sélectionnées dans LEUR formation : crée le compte
 * (si besoin) à partir de l'email collecté, inscrit l'élève (gratuit/manuel), et
 * passe la demande au statut « enrolled ». Réservé à l'admin.
 */
export async function bulkEnrollRequests(requestIds: string[]) {
  const idsOk = z.array(z.string().uuid()).min(1).max(200).safeParse(requestIds);
  if (!idsOk.success) return { ok: false, error: "Sélection invalide." };
  const { ok, admin } = await requireAdmin();
  if (!ok || !admin) return { ok: false, error: "Accès refusé." };

  const { data: reqs } = await admin
    .from("enrollment_requests")
    .select("id, course_id, email, full_name, status")
    .in("id", idsOk.data);
  if (!reqs?.length) return { ok: false, error: "Aucune demande trouvée." };

  let enrolled = 0;
  let skipped = 0;
  for (const r of reqs) {
    if (r.status === "enrolled") { skipped++; continue; }
    const email = (r.email ?? "").trim().toLowerCase();
    if (!email || !r.course_id) { skipped++; continue; }

    // Compte (créé si nécessaire)
    let studentId: string | null = null;
    const { data: existing } = await admin.from("users").select("id").eq("email", email).maybeSingle();
    if (existing) studentId = existing.id;
    else {
      const { data: created } = await admin.auth.admin.createUser({
        email, email_confirm: true,
        user_metadata: { nom: r.full_name?.trim() || email.split("@")[0], account_type: "formations" },
      });
      studentId = created?.user?.id ?? null;
    }
    if (!studentId) { skipped++; continue; }

    // Inscription (idempotente)
    const { data: enr } = await admin
      .from("enrollments").select("id").eq("user_id", studentId).eq("course_id", r.course_id).maybeSingle();
    if (!enr) {
      const { data: course } = await admin.from("courses").select("formateur_id, titre_fr").eq("id", r.course_id).maybeSingle();
      const { error: insErr } = await admin.from("enrollments").insert({
        user_id: studentId, course_id: r.course_id, amount: 0, currency: "DZD",
        formateur_id: (course as { formateur_id?: string | null } | null)?.formateur_id ?? null,
      });
      if (insErr) { skipped++; continue; }
      try {
        await admin.from("notifications").insert({
          user_id: studentId, type: "system", title: "🎓 Nouvelle formation accessible",
          body: `Vous avez été inscrite à « ${(course as { titre_fr?: string } | null)?.titre_fr ?? "votre formation"} ». Bonne formation !`,
          link: "/dashboard",
        });
      } catch { /* ignore */ }
    }

    await admin.from("enrollment_requests").update({ status: "enrolled" }).eq("id", r.id);
    enrolled++;
  }

  revalidatePath("/admin/demandes-enrolement");
  revalidatePath("/dashboard");
  return { ok: true, enrolled, skipped };
}

/** Écarte une demande d'enrôlement (statut « dismissed »). Réservé à l'admin. */
export async function dismissEnrollmentRequest(requestId: string) {
  const idOk = z.string().uuid().safeParse(requestId);
  if (!idOk.success) return { ok: false, error: "Demande invalide." };
  const { ok, admin } = await requireAdmin();
  if (!ok || !admin) return { ok: false, error: "Accès refusé." };
  const { error } = await admin.from("enrollment_requests").update({ status: "dismissed" }).eq("id", idOk.data);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/demandes-enrolement");
  return { ok: true };
}

/** Fixe le taux de commission global de la plateforme (en %, 0–100). Réservé à l'admin. */
export async function setCommissionRate(rate: number) {
  const r = Number(rate);
  if (!Number.isFinite(r) || r < 0 || r > 100) return { ok: false, error: "Taux invalide (0–100)." };
  const { ok, admin } = await requireAdmin();
  if (!ok || !admin) return { ok: false, error: "Accès refusé." };
  const { error } = await admin
    .from("platform_config")
    .upsert({ id: 1, commission_rate: Math.round(r * 100) / 100, updated_at: new Date().toISOString() }, { onConflict: "id" });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/patronnistes");
  return { ok: true };
}

/** Fixe le taux de commission FORMATEUR (en %, 0–100). Réservé à l'admin. */
export async function setFormateurCommissionRate(rate: number) {
  const r = Number(rate);
  if (!Number.isFinite(r) || r < 0 || r > 100) return { ok: false, error: "Taux invalide (0–100)." };
  const { ok, admin } = await requireAdmin();
  if (!ok || !admin) return { ok: false, error: "Accès refusé." };
  const { error } = await admin
    .from("platform_config")
    .upsert({ id: 1, formateur_commission_rate: Math.round(r * 100) / 100, updated_at: new Date().toISOString() }, { onConflict: "id" });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/formateurs");
  return { ok: true };
}
