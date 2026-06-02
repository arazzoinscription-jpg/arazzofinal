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
