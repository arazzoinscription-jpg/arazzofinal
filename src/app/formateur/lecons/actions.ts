"use server";

import { z } from "zod";
import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isFormateur, isAdmin } from "@/lib/roles";
import { copieDeLecon, slugDeCours, type LeconBrute } from "@/lib/lecons/bibliotheque";
import { chargerLecons } from "@/lib/lecons/charger";

/**
 * Fenêtre « Ajouter une leçon » de l'éditeur de cours : les leçons qu'on peut reprendre, dans l'ordre du parcours
 * (la fenêtre les montre créées dernièrement d'abord, et insère les cochées dans l'ordre du parcours).
 * Lue seulement à l'ouverture de la fenêtre (l'éditeur ne charge pas 700 leçons pour rien).
 */
export async function listerLecons() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Non authentifié." };
  const { data: prof } = await supabase.from("users").select("role, roles").eq("id", user.id).single();
  if (!isFormateur(prof)) return { ok: false as const, error: "Accès refusé." };
  return { ok: true as const, lecons: await chargerLecons(createAdminClient(), user.id, isAdmin(prof)) };
}

const Schema = z.object({
  titre: z.string().trim().min(2, "Donnez un titre au cours (2 caractères minimum).").max(200),
  lessonIds: z.array(z.string().uuid()).min(1, "Sélectionnez au moins une leçon.").max(300, "300 leçons au maximum."),
});

/**
 * « Les leçons » → nouveau cours : COPIE les leçons cochées (dans l'ordre choisi) dans un nouveau cours en
 * brouillon, un seul chapitre, à son nom. Même vidéo, même devoir ; les leçons d'origine ne bougent pas.
 *
 * Autorisation (comme « Mes cours ») : un formateur ne prend que des leçons de SES cours ou des cours importés
 * (formateur_id NULL) ; l'admin, de n'importe quel cours. Écritures par le client ADMIN, vérifiées ici.
 * En cas d'échec en cours de route, le cours à moitié créé est supprimé (cascade chapitre + leçons).
 */
export async function creerCoursDepuisLecons(input: z.infer<typeof Schema>) {
  const parsed = Schema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0].message };
  const { titre } = parsed.data;
  const lessonIds = [...new Set(parsed.data.lessonIds)];

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Non authentifié." };
  const { data: prof } = await supabase.from("users").select("role, roles").eq("id", user.id).single();
  if (!isFormateur(prof)) return { ok: false as const, error: "Accès refusé." };

  const admin = createAdminClient();
  const { data: sources, error: lectureErr } = await admin
    .from("lessons").select("*, chapter:chapters(course:courses(formateur_id))").in("id", lessonIds);
  if (lectureErr) return { ok: false as const, error: lectureErr.message };
  type Source = LeconBrute & { chapter?: { course?: { formateur_id: string | null } | null } | null };
  const parId = new Map(((sources ?? []) as Source[]).map((l) => [l.id, l]));
  if (parId.size !== lessonIds.length) return { ok: false as const, error: "Une des leçons n'existe plus : rechargez la page." };
  if (!isAdmin(prof)) {
    const interdite = [...parId.values()].some((l) => {
      const proprio = l.chapter?.course?.formateur_id ?? null;
      return proprio !== null && proprio !== user.id;
    });
    if (interdite) return { ok: false as const, error: "Une des leçons appartient au cours d'un autre formateur." };
  }

  const { data: cours, error: coursErr } = await admin.from("courses").insert({
    titre_fr: titre,
    slug: slugDeCours(titre, randomUUID().slice(0, 6)),
    formateur_id: user.id,
    published: false,
  }).select("id").single();
  if (coursErr || !cours) return { ok: false as const, error: coursErr?.message ?? "Création du cours échouée." };
  const courseId = cours.id as string;
  const annuler = async (error: string) => {
    await admin.from("courses").delete().eq("id", courseId);
    return { ok: false as const, error };
  };

  const { data: chapitre, error: chErr } = await admin
    .from("chapters").insert({ course_id: courseId, titre: "Chapitre 1", ordre: 1 }).select("id").single();
  if (chErr || !chapitre) return annuler(chErr?.message ?? "Création du chapitre échouée.");

  const copies = lessonIds.map((id, i) => copieDeLecon(parId.get(id)!, chapitre.id as string, i + 1));
  const { data: creees, error: lecErr } = await admin.from("lessons").insert(copies).select("id, ordre");
  if (lecErr || !creees) return annuler(lecErr?.message ?? "Copie des leçons échouée.");

  // « Devoir à faire » de chaque leçon (migrations 046 / 062) — écrit à part et sans bloquer : sans ces colonnes,
  // le cours est quand même créé.
  for (const c of creees as { id: string; ordre: number }[]) {
    const source = parId.get(lessonIds[c.ordre - 1]);
    if (source?.devoir) await admin.from("lessons").update({ devoir: source.devoir }).eq("id", c.id);
    if (source?.devoir_obligatoire) await admin.from("lessons").update({ devoir_obligatoire: true }).eq("id", c.id);
  }

  revalidatePath("/formateur/cours");
  revalidatePath("/formateur/lecons");
  return { ok: true as const, courseId };
}
