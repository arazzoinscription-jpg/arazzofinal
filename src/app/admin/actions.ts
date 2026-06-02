"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, admin: null };
  const { data: prof } = await supabase.from("users").select("role").eq("id", user.id).single();
  return { ok: prof?.role === "admin", admin: createAdminClient(), userId: user.id };
}

const RoleSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(["eleve", "formateur", "admin"]),
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

export async function toggleCoursePublish(courseId: string, published: boolean) {
  const { ok, admin } = await requireAdmin();
  if (!ok || !admin) return { ok: false, error: "Accès refusé." };
  const { error } = await admin.from("courses").update({ published }).eq("id", courseId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/formations");
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
