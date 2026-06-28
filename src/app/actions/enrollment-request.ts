"use server";

import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";

const Schema = z.object({
  courseId: z.string().uuid("Formation invalide."),
  full_name: z.string().trim().min(2, "Nom complet requis."),
  email: z.string().email("Email invalide."),
  phone: z.string().trim().max(40).optional().nullable(),
  wilaya: z.string().trim().max(80).optional().nullable(),
});

/**
 * Demande d'enrôlement publique : un visiteur manifeste son intérêt pour une
 * formation (nom + email). Sert à mesurer l'intérêt et à enrôler en masse plus
 * tard. Idempotent par (formation, email) : une nouvelle demande met à jour les
 * coordonnées sans créer de doublon.
 */
export async function requestEnrollment(input: unknown) {
  const parsed = Schema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0].message };
  const { courseId, full_name, email, phone, wilaya } = parsed.data;
  const cleanEmail = email.trim().toLowerCase();

  const admin = createAdminClient();
  const { data: course } = await admin
    .from("courses").select("id, published").eq("id", courseId).maybeSingle();
  if (!course || !course.published) return { ok: false as const, error: "Formation indisponible." };

  const { error } = await admin
    .from("enrollment_requests")
    .upsert(
      { course_id: courseId, full_name, email: cleanEmail, phone: phone ?? null, wilaya: wilaya ?? null, status: "pending" },
      { onConflict: "course_id,email" },
    );
  if (error) return { ok: false as const, error: "Envoi impossible. Réessayez." };

  return { ok: true as const };
}
