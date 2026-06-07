"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/** Définit les catégories d'un cours (remplace l'existant). Formateur propriétaire ou admin. */
export async function setCourseCategories(courseId: string, categoryIds: string[]) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Non authentifié." };
  const { data: prof } = await supabase.from("users").select("role").eq("id", user.id).single();
  const isAdmin = prof?.role === "admin";

  const admin = createAdminClient();
  const { data: course } = await admin.from("courses").select("formateur_id").eq("id", courseId).maybeSingle();
  if (!course) return { ok: false, error: "Cours introuvable." };
  if (course.formateur_id !== user.id && !isAdmin) return { ok: false, error: "Accès refusé." };

  await admin.from("course_categories").delete().eq("course_id", courseId);
  const rows = [...new Set(categoryIds.filter(Boolean))].map((category_id) => ({ course_id: courseId, category_id }));
  if (rows.length > 0) {
    const { error } = await admin.from("course_categories").insert(rows);
    if (error) return { ok: false, error: error.message };
  }
  revalidatePath("/formations");
  revalidatePath(`/formateur/cours/${courseId}/edit`);
  return { ok: true };
}
