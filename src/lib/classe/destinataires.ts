/**
 * Destinataires d'une action de l'enseignante — TOUJOURS limités à son espace
 * (administration : toutes les élèves ; formatrice : élèves de SES cours, SES groupes).
 * Comptes d'équipe exclus. LECTURE SEULE (aucun envoi ici).
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { getRoles } from "../roles";
import { voitCours, voitEleve, type Espace } from "../espace/portee";
import { paquets } from "../student-care/paginate";
import type { CibleCommande, Destinataire } from "./commande";
import { groupesDeLespace, peutVoirGroupe } from "./groupes";

type Categorie = "private_msg" | "announcements";

async function inscriptionsDe(admin: SupabaseClient, ids: string[]): Promise<Map<string, { course_id: string }[]>> {
  const m = new Map<string, { course_id: string }[]>();
  for (const lot of paquets(ids, 100)) {
    // eslint-disable-next-line no-await-in-loop
    const r = await admin.from("enrollments").select("user_id, course_id").in("user_id", lot);
    if (r.error) throw new Error(`Inscriptions illisibles : ${r.error.message}`);
    for (const e of (r.data ?? []) as { user_id: string; course_id: string }[]) m.set(e.user_id, [...(m.get(e.user_id) ?? []), { course_id: e.course_id }]);
  }
  return m;
}

/** Identifiants des élèves visées, déjà filtrés par l'espace. */
async function idsVises(admin: SupabaseClient, e: Espace, cible: CibleCommande): Promise<string[]> {
  if (cible.type === "niveau") {
    if (!voitCours(e, cible.courseId)) return [];
    const r = await admin.from("enrollments").select("user_id").eq("course_id", cible.courseId);
    if (r.error) throw new Error(`Inscriptions illisibles : ${r.error.message}`);
    return [...new Set(((r.data ?? []) as { user_id: string }[]).map((x) => x.user_id))];
  }
  let ids: string[] = cible.type === "eleve" ? [cible.id] : [];
  if (cible.type === "groupe") {
    const g = (await groupesDeLespace(admin, e)).find((x) => x.id === cible.id);
    if (!g || !peutVoirGroupe(e, g)) return [];
    ids = g.membres;
  }
  if (e.cours === null) return [...new Set(ids)];
  const ins = await inscriptionsDe(admin, ids);
  return [...new Set(ids)].filter((id) => voitEleve(e, ins.get(id) ?? []));
}

export async function destinatairesPour(admin: SupabaseClient, e: Espace, cible: CibleCommande, categorie: Categorie): Promise<Destinataire[]> {
  const ids = await idsVises(admin, e, cible);
  if (!ids.length) return [];

  const personnes: { id: string; nom: string | null; email: string | null; role: string | null; roles: string[] | null }[] = [];
  const prefs = new Map<string, boolean>();
  for (const lot of paquets(ids, 100)) {
    // eslint-disable-next-line no-await-in-loop
    const u = await admin.from("users").select("id, nom, email, role, roles").in("id", lot);
    if (u.error) throw new Error(`Profils illisibles : ${u.error.message}`);
    personnes.push(...((u.data ?? []) as typeof personnes));
    // eslint-disable-next-line no-await-in-loop
    const p = await admin.from("email_preferences").select(`user_id, ${categorie}`).in("user_id", lot);
    for (const x of (p.data ?? []) as unknown as Record<string, unknown>[]) prefs.set(String(x.user_id), x[categorie] !== false);
  }
  // Catégorie coupée par l'administration (Préférences) : personne ne la reçoit.
  const cfg = await admin.from("platform_config").select("email_categories").eq("id", 1).maybeSingle();
  const coupee = ((cfg.data as { email_categories?: Record<string, boolean> } | null)?.email_categories ?? {})[categorie] === false;

  return personnes
    .filter((p) => !getRoles(p).some((r) => r === "formateur" || r === "admin"))
    .map((p) => ({
      id: p.id,
      nom: (p.nom ?? "").trim() || "Élève",
      email: p.email,
      emailAutorise: coupee ? false : prefs.has(p.id) ? prefs.get(p.id)! : null,
    }))
    .sort((a, b) => a.nom.localeCompare(b.nom, "fr"));
}

/** Identifiants des ÉLÈVES visées (espace vérifié, comptes d'équipe exclus) — pour la cloche de classe. */
export async function elevesVisees(admin: SupabaseClient, e: Espace, cible: CibleCommande): Promise<string[]> {
  const ids = await idsVises(admin, e, cible);
  const eleves: string[] = [];
  for (const lot of paquets(ids, 100)) {
    // eslint-disable-next-line no-await-in-loop
    const u = await admin.from("users").select("id, role, roles").in("id", lot);
    if (u.error) throw new Error(`Profils illisibles : ${u.error.message}`);
    for (const p of (u.data ?? []) as { id: string; role: string | null; roles: string[] | null }[]) {
      if (!getRoles(p).some((r) => r === "formateur" || r === "admin")) eleves.push(p.id);
    }
  }
  return eleves;
}
