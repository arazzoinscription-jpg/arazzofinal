"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Vérifie que l'utilisateur courant peut gérer un cours donné :
 * soit il en est le formateur propriétaire, soit il est administrateur.
 */
async function requireCourseAccess(courseId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, admin: null, error: "Non authentifié." };

  const { data: prof } = await supabase.from("users").select("role").eq("id", user.id).single();
  const admin = createAdminClient();

  const { data: course } = await admin
    .from("courses").select("formateur_id").eq("id", courseId).single();
  if (!course) return { ok: false as const, admin: null, error: "Cours introuvable." };

  const isOwner = course.formateur_id === user.id;
  const isAdmin = prof?.role === "admin";
  if (!isOwner && !isAdmin) return { ok: false as const, admin: null, error: "Accès refusé." };

  return { ok: true as const, admin, isAdmin };
}

const UpdateSchema = z.object({
  id: z.string().uuid(),
  titre_fr: z.string().min(2, "Le titre est requis."),
  titre_ar: z.string().nullable().optional(),
  description_fr: z.string().min(1, "La description est requise."),
  description_ar: z.string().nullable().optional(),
  niveau: z.enum(["debutant", "intermediaire", "avance"]),
  duree: z.string().nullable().optional(),
  prix_dzd: z.number().int().min(0),
  prix_eur: z.number().int().min(0),
  thumbnail: z.string().nullable().optional(),
  published: z.boolean(),
});

/** Met à jour les informations d'un cours (formateur propriétaire ou admin). */
export async function updateCourse(input: z.infer<typeof UpdateSchema>) {
  const parsed = UpdateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const access = await requireCourseAccess(parsed.data.id);
  if (!access.ok || !access.admin) return { ok: false, error: access.error };

  const d = parsed.data;
  const { error } = await access.admin
    .from("courses")
    .update({
      titre_fr: d.titre_fr,
      titre_ar: d.titre_ar || null,
      description_fr: d.description_fr,
      description_ar: d.description_ar || null,
      niveau: d.niveau,
      duree: d.duree || null,
      prix_dzd: d.prix_dzd,
      prix_eur: d.prix_eur,
      thumbnail: d.thumbnail || null,
      published: d.published,
    })
    .eq("id", d.id);

  if (error) return { ok: false, error: error.message };

  // Revalider les vues concernées (dashboard, admin, pages publiques ISR)
  revalidatePath("/formateur");
  revalidatePath("/admin/formations");
  revalidatePath(`/formateur/cours/${d.id}/edit`);
  revalidatePath("/formations");
  revalidatePath("/");
  return { ok: true };
}
