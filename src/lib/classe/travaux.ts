/**
 * Travaux pratiques d'UNE élève (fiche « Ma classe » et fiche de suivi). LECTURE SEULE.
 * Dans l'espace formatrice, seuls les travaux des cours de la formatrice sont rendus.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { paquets } from "../student-care/paginate";

export type StatutTravail = "submitted" | "reviewed" | "approved";

export const LIBELLE_TRAVAIL: Record<StatutTravail, string> = {
  submitted: "À corriger",
  reviewed: "Retour envoyé — à retravailler",
  approved: "Validé",
};

export interface TravailEleve {
  id: string;
  cree_le: string;
  statut: StatutTravail | string;
  lecon: string;
  cours: string | null;
  course_id: string | null;
  photo: string | null;
  video: string | null;
  /** Photo annotée par l'enseignante (si elle existe). */
  annotation: string | null;
  note: string | null;
  retour: string | null;
}

const LIMITE = 200;

/** Adresse de média sûre pour un lien ou une balise (http(s) ou /media/… du site), sinon null. */
export function mediaSur(url: string | null | undefined): string | null {
  const u = (url ?? "").trim();
  return /^https?:\/\//i.test(u) || /^\/media\/[^/]/.test(u) ? u : null;
}

export async function lireTravauxEleve(
  admin: SupabaseClient,
  userId: string,
  coursAutorises: ReadonlySet<string> | null,
): Promise<{ travaux: TravailEleve[]; complet: boolean }> {
  const r = await admin
    .from("lesson_practicals")
    .select("id, lesson_id, photo_url, video_url, annotation_url, note, feedback, status, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(LIMITE + 1);
  if (r.error) throw new Error(`Travaux pratiques illisibles : ${r.error.message}`);
  const lignes = (r.data ?? []) as {
    id: string; lesson_id: string; photo_url: string | null; video_url: string | null; annotation_url?: string | null;
    note: string | null; feedback: string | null; status: string; created_at: string;
  }[];

  // Leçon → chapitre → cours (lectures séparées, par lots).
  const lecons = new Map<string, { titre: string; chapter_id: string | null }>();
  const chapitres = new Map<string, string>();
  const cours = new Map<string, string>();
  const idsLecons = [...new Set(lignes.map((l) => l.lesson_id).filter(Boolean))];
  for (const lot of paquets(idsLecons, 100)) {
    // eslint-disable-next-line no-await-in-loop
    const x = await admin.from("lessons").select("id, titre, chapter_id").in("id", lot);
    for (const l of (x.data ?? []) as { id: string; titre: string | null; chapter_id: string | null }[]) lecons.set(l.id, { titre: l.titre ?? "Leçon", chapter_id: l.chapter_id });
  }
  const idsChapitres = [...new Set([...lecons.values()].map((l) => l.chapter_id).filter(Boolean) as string[])];
  for (const lot of paquets(idsChapitres, 100)) {
    // eslint-disable-next-line no-await-in-loop
    const x = await admin.from("chapters").select("id, course_id").in("id", lot);
    for (const c of (x.data ?? []) as { id: string; course_id: string }[]) chapitres.set(c.id, c.course_id);
  }
  const idsCours = [...new Set(chapitres.values())];
  for (const lot of paquets(idsCours, 100)) {
    // eslint-disable-next-line no-await-in-loop
    const x = await admin.from("courses").select("id, titre_fr").in("id", lot);
    for (const c of (x.data ?? []) as { id: string; titre_fr: string | null }[]) cours.set(c.id, c.titre_fr ?? "Formation");
  }

  const travaux = lignes.slice(0, LIMITE).map((l) => {
    const lecon = lecons.get(l.lesson_id);
    const courseId = lecon?.chapter_id ? chapitres.get(lecon.chapter_id) ?? null : null;
    return {
      id: l.id, cree_le: l.created_at, statut: l.status,
      lecon: lecon?.titre ?? "Leçon", cours: courseId ? cours.get(courseId) ?? null : null, course_id: courseId,
      photo: mediaSur(l.photo_url), video: mediaSur(l.video_url), annotation: mediaSur(l.annotation_url ?? null),
      note: l.note, retour: l.feedback,
    };
  }).filter((t) => coursAutorises === null || (t.course_id !== null && coursAutorises.has(t.course_id)));

  return { travaux, complet: lignes.length <= LIMITE };
}
