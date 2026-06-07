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
