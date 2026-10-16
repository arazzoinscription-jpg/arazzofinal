"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { espaceFormatrice, niveauxAutorises } from "@/lib/espace/load";
import { coursNiveaux } from "@/lib/live-care/load";
import { lireReglagesInscription } from "@/lib/groupes-places";

/**
 * Groupe EN LIGNE à places : niveau, nombre de places, date de début, inscription ouverte.
 * La créatrice du groupe (ou l'administration) seulement ; le niveau doit être l'un de SES niveaux.
 * Une fois ouvert, chaque nouvelle inscription validée au niveau y est ajoutée (migration 101).
 */

const INDISPONIBLE = "Les groupes à places ne sont pas encore activés sur ce site (migration 101 à appliquer).";

export interface ReglagesGroupe {
  disponible: boolean;
  courseId: string | null;
  capacite: number | null;
  debut: string | null;
  ouverte: boolean;
  membres: number;
  niveaux: { id: string; code: string; titre: string }[];
}

async function autoriser(groupId: string) {
  const espace = await espaceFormatrice();
  if (!espace) return { ok: false as const, erreur: "Accès refusé." };
  if (!/^[0-9a-f-]{36}$/i.test(groupId)) return { ok: false as const, erreur: "Groupe invalide." };
  const admin = createAdminClient();
  const { data: g } = await admin.from("groups").select("creator_id").eq("id", groupId).maybeSingle();
  if (!g || (g.creator_id !== espace.userId && !espace.estAdmin)) return { ok: false as const, erreur: "Accès refusé." };
  return { ok: true as const, espace, admin };
}

export async function lireReglagesGroupe(groupId: string): Promise<{ ok: true; reglages: ReglagesGroupe } | { ok: false; erreur: string }> {
  const a = await autoriser(groupId);
  if (!a.ok) return a;
  let niveaux: ReglagesGroupe["niveaux"] = [];
  try { niveaux = niveauxAutorises(a.espace, await coursNiveaux(a.admin)).map((n) => ({ id: n.id, code: n.code, titre: n.titre })); } catch { niveaux = []; }
  const { count } = await a.admin.from("group_members").select("id", { count: "exact", head: true }).eq("group_id", groupId);
  const r = await a.admin.from("groups").select("course_id, capacite, debut, inscription_ouverte").eq("id", groupId).maybeSingle();
  if (r.error) return { ok: true, reglages: { disponible: false, courseId: null, capacite: null, debut: null, ouverte: false, membres: count ?? 0, niveaux } };
  const d = r.data as { course_id: string | null; capacite: number | null; debut: string | null; inscription_ouverte: boolean } | null;
  return { ok: true, reglages: { disponible: true, courseId: d?.course_id ?? null, capacite: d?.capacite ?? null, debut: d?.debut ?? null, ouverte: Boolean(d?.inscription_ouverte), membres: count ?? 0, niveaux } };
}

export async function enregistrerReglagesGroupe(entree: { groupId: string; courseId: unknown; capacite: unknown; debut: unknown; ouverte: unknown }): Promise<{ ok: true } | { ok: false; erreur: string }> {
  const a = await autoriser(entree.groupId);
  if (!a.ok) return a;
  const v = lireReglagesInscription({ capacite: entree.capacite, debut: entree.debut, ouverte: entree.ouverte });
  if (!v.ok) return { ok: false, erreur: v.erreur };
  const niveaux = niveauxAutorises(a.espace, await coursNiveaux(a.admin));
  const courseId = typeof entree.courseId === "string" && entree.courseId ? entree.courseId : null;
  if (courseId && !niveaux.some((n) => n.id === courseId)) return { ok: false, erreur: "Ce niveau ne fait pas partie de vos cours." };
  if (v.ouverte && !courseId) return { ok: false, erreur: "Choisissez le niveau du groupe avant d'ouvrir l'inscription." };
  const r = await a.admin.from("groups").update({ course_id: courseId, capacite: v.capacite, debut: v.debut, inscription_ouverte: v.ouverte }).eq("id", entree.groupId);
  if (r.error) return { ok: false, erreur: /column|schema cache/i.test(r.error.message) ? INDISPONIBLE : r.error.message };
  revalidatePath(`/formateur/groupes/${entree.groupId}`);
  revalidatePath("/formateur/groupes");
  return { ok: true };
}
