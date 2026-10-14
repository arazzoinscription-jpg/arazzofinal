"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { adminConnecte } from "@/lib/student-care/guard";
import { TABLE_REGLAGES } from "@/lib/student-care/load";
import { CLES_SEUILS } from "@/lib/student-care/rules";
import { estJourValide } from "@/lib/student-care/time";

/**
 * Enregistre la date de début du suivi et les seuils (jours).
 * Seule écriture du module : la ligne unique `student_care_settings`. Aucun envoi,
 * aucune automatisation : les seuils ne servent qu'à l'AFFICHAGE du tableau.
 */
export async function enregistrerReglages(formData: FormData): Promise<void> {
  const moi = await adminConnecte();
  if (!moi) redirect("/dashboard");

  const date = String(formData.get("start_date") ?? "").trim();
  if (date && !estJourValide(date)) redirect("/admin/suivi?erreur=date");

  const seuils: Record<string, number> = {};
  for (const cle of CLES_SEUILS) {
    const v = Number(formData.get(cle));
    if (!Number.isInteger(v) || v < 1 || v > 365) redirect("/admin/suivi?erreur=seuil");
    seuils[cle] = v;
  }
  if (seuils.inactive_jours < seuils.active_jours || seuils.contact_jours < seuils.inactive_jours) {
    redirect("/admin/suivi?erreur=ordre");
  }

  const { error } = await createAdminClient().from(TABLE_REGLAGES).upsert(
    { id: 1, start_date: date || null, thresholds: seuils, updated_at: new Date().toISOString(), updated_by: moi.userId },
    { onConflict: "id" },
  );
  if (error) redirect("/admin/suivi?erreur=enregistrement");

  revalidatePath("/admin/suivi");
  redirect("/admin/suivi?enregistre=1");
}
