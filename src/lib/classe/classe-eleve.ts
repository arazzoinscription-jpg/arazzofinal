/**
 * « Ma classe » CÔTÉ ÉLÈVE — ce qu'une élève voit de sa classe. Données VOLONTAIREMENT limitées :
 *  - ses enseignantes (photo, nom, niveaux qu'elles encadrent) ;
 *  - ses camarades DE GROUPE seulement (photo, nom PUBLIC — pseudo, ou initiales + numéro —, niveaux en commun) et leur PROGRESSION
 *    (leçons terminées, en %) dans les cours partagés — la même donnée que leur profil communauté.
 *    AUCUN statut de suivi, aucune relance : un clic ouvre leur profil communauté, comme depuis le feed.
 *    (La communauté promet un pseudo « pour protéger votre vie privée » : jamais le nom complet ici.)
 * Les élèves des AUTRES groupes n'apparaissent pas ici (elles restent visibles sur le feed communauté).
 * Les comptes d'équipe (formatrice, admin) ne sont jamais listés comme camarades.
 * LECTURE SEULE.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { getRoles } from "../roles";
import { VUE_INSCRIPTIONS } from "../student-care/read";
import { NIVEAU_PAR_COURS } from "../student-care/levels";
import { lireTout, paquets } from "../student-care/paginate";
import { avatarSur, initiales, normaliser } from "./vue";
import { initialesPubliques, nomPublic } from "../nom-public";

export interface PersonneClasse {
  id: string;
  nom: string;
  initiales: string;
  avatar: string | null;
  /** Niveaux (N1/N2/N3) ou titres des cours partagés avec l'élève. */
  niveaux: string[];
  /** Progression dans chaque cours partagé (leçons terminées / leçons du cours) ; pct null = cours sans leçon. */
  progression: { cours: string; pct: number | null; faites: number; total: number }[];
  /** Groupes (de l'élève connectée) dont cette camarade fait partie. */
  groupes: string[];
  cle: string;
}
export type EnseignanteClasse = Omit<PersonneClasse, "cle" | "progression" | "groupes">;
export interface GroupeClasse { id: string; nom: string; membres: string[] }

export interface ClasseEleve {
  cours: { id: string; titre: string; niveau: string | null }[];
  enseignantes: EnseignanteClasse[];
  camarades: PersonneClasse[];
  /** Les groupes de l'élève (= ses classes). Vide : pas encore de groupe, donc pas de camarades. */
  groupes: { id: string; nom: string; nb: number }[];
  complet: boolean;
}

interface Personne { id: string; nom: string | null; username?: string | null; avatar_url: string | null; role: string | null; roles: string[] | null }

/** Nom montré aux CAMARADES : le même nom public que sur le feed (pseudo, sinon initiales + numéro). */
export function nomCamarade(p: Pick<Personne, "id" | "nom" | "username">): string {
  return nomPublic({ id: p.id, nom: p.nom, username: p.username, role: "eleve" });
}

const libelleCours = (c: { id: string; titre: string }) => NIVEAU_PAR_COURS.get(c.id) ?? c.titre;

/** Module PUR : assemble la classe d'une élève à partir des lignes lues. */
export function construireClasseEleve({ moi, cours, inscriptions, personnes, progres = [], groupes }: {
  moi: string;
  cours: { id: string; titre: string; formateur_id: string | null }[];
  inscriptions: { user_id: string; course_id: string }[];
  personnes: Personne[];
  /** Leçons terminées par élève et par cours (vue du suivi). Absent = progression non affichée. */
  progres?: { user_id: string; course_id: string; faites: number; total: number }[];
  /** Groupes DE L'ÉLÈVE avec leurs membres : les camarades sont alors les membres de ces groupes, et eux seuls.
   *  Absent = ancien mode (élèves des mêmes cours). */
  groupes?: GroupeClasse[];
}): Omit<ClasseEleve, "complet"> {
  const progresDe = new Map<string, { faites: number; total: number }>();
  for (const p of progres) {
    const cle = `${p.user_id}|${p.course_id}`;
    const deja = progresDe.get(cle);
    // Deux inscriptions au même cours : on garde la plus avancée (jamais additionnées).
    if (!deja || p.faites > deja.faites) progresDe.set(cle, { faites: Math.max(0, p.faites), total: Math.max(0, p.total) });
  }
  const parId = new Map(personnes.map((p) => [p.id, p]));
  const coursParId = new Map(cours.map((c) => [c.id, c]));
  const estEquipe = (p: Personne) => getRoles(p).some((r) => r === "formateur" || r === "admin");
  const nom = (p: Personne) => (p.nom ?? "").trim() || "Membre";

  // Enseignantes : les formatrices des cours suivis.
  const coursParEnseignante = new Map<string, string[]>();
  for (const c of cours) {
    if (!c.formateur_id || c.formateur_id === moi) continue;
    coursParEnseignante.set(c.formateur_id, [...(coursParEnseignante.get(c.formateur_id) ?? []), libelleCours(c)]);
  }
  const enseignantes = [...coursParEnseignante.entries()]
    .map(([id, niveaux]) => ({ id, p: parId.get(id), niveaux }))
    .filter((x): x is { id: string; p: Personne; niveaux: string[] } => Boolean(x.p))
    .map(({ id, p, niveaux }) => ({ id, nom: nom(p), initiales: initiales(nom(p)), avatar: avatarSur(p.avatar_url), niveaux: [...new Set(niveaux)].sort() }))
    .sort((a, b) => a.nom.localeCompare(b.nom, "fr"));

  // Cours partagés avec chaque autre élève (niveaux en commun, progression).
  const coursPartages = new Map<string, Set<string>>();
  for (const i of inscriptions) {
    if (i.user_id === moi || !coursParId.has(i.course_id)) continue;
    coursPartages.set(i.user_id, (coursPartages.get(i.user_id) ?? new Set()).add(i.course_id));
  }
  // Camarades : les membres de MES groupes (mode groupes) — sinon les élèves des mêmes cours.
  const groupesDe = new Map<string, string[]>();
  for (const g of groupes ?? []) for (const id of g.membres) if (id !== moi) groupesDe.set(id, [...(groupesDe.get(id) ?? []), g.id]);
  const visibles: [string, Set<string>][] = groupes
    ? [...groupesDe.keys()].map((id) => [id, coursPartages.get(id) ?? new Set<string>()])
    : [...coursPartages.entries()];
  const camarades = visibles
    .map(([id, ids]) => ({ id, p: parId.get(id), ids }))
    .filter((x): x is { id: string; p: Personne; ids: Set<string> } => Boolean(x.p) && !estEquipe(x.p as Personne) && !coursParEnseignante.has(x.id))
    .map(({ id, p, ids }) => ({
      id, nom: nomCamarade(p), initiales: initialesPubliques(nomCamarade(p)), avatar: avatarSur(p.avatar_url),
      niveaux: [...new Set([...ids].map((c) => libelleCours(coursParId.get(c)!)))].sort(),
      progression: [...ids]
        .map((c) => ({ c, pr: progresDe.get(`${id}|${c}`) }))
        .filter((x): x is { c: string; pr: { faites: number; total: number } } => Boolean(x.pr))
        .map(({ c, pr }) => ({
          cours: libelleCours(coursParId.get(c)!),
          pct: pr.total > 0 ? Math.min(100, Math.round((pr.faites / pr.total) * 100)) : null,
          faites: Math.min(pr.faites, pr.total || pr.faites), total: pr.total,
        }))
        .sort((a, b) => a.cours.localeCompare(b.cours)),
      groupes: groupesDe.get(id) ?? [],
      cle: normaliser(nomCamarade(p)),
    }))
    .sort((a, b) => a.nom.localeCompare(b.nom, "fr"));

  return {
    cours: cours.map((c) => ({ id: c.id, titre: c.titre, niveau: NIVEAU_PAR_COURS.get(c.id) ?? null }))
      .sort((a, b) => (a.niveau ?? "Z").localeCompare(b.niveau ?? "Z")),
    enseignantes,
    camarades,
    groupes: (groupes ?? []).map((g) => ({ id: g.id, nom: g.nom, nb: camarades.filter((c) => c.groupes.includes(g.id)).length }))
      .sort((a, b) => a.nom.localeCompare(b.nom, "fr")),
  };
}

/** Lit la classe d'une élève (client service fourni par l'appelant ; tout est filtré par SES cours). */
export async function chargerClasseEleve(admin: SupabaseClient, moi: string): Promise<ClasseEleve> {
  const mes = await admin.from("enrollments").select("course_id").eq("user_id", moi);
  if (mes.error) throw new Error(`Inscriptions illisibles : ${mes.error.message}`);
  const ids = [...new Set((mes.data ?? []).map((e: { course_id: string }) => e.course_id))];
  if (!ids.length) return { cours: [], enseignantes: [], camarades: [], groupes: [], complet: true };

  const c = await admin.from("courses").select("id, titre_fr, formateur_id").in("id", ids);
  if (c.error) throw new Error(`Cours illisibles : ${c.error.message}`);
  const cours = (c.data ?? []).map((x: { id: string; titre_fr: string | null; formateur_id: string | null }) => ({ id: x.id, titre: x.titre_fr ?? "Formation", formateur_id: x.formateur_id }));

  const ins = await lireTout<{ user_id: string; course_id: string }>((de, a) => admin
    .from("enrollments").select("user_id, course_id").in("course_id", ids).order("id").range(de, a));

  // Mes groupes (= mes classes) et leurs membres : seules ces élèves seront mes camarades.
  const mg = await admin.from("group_members").select("group_id").eq("user_id", moi);
  if (mg.error) throw new Error(`Groupes illisibles : ${mg.error.message}`);
  const gids = [...new Set(((mg.data ?? []) as { group_id: string }[]).map((x) => x.group_id))];
  const groupes: GroupeClasse[] = [];
  if (gids.length) {
    const g = await admin.from("groups").select("id, name").in("id", gids);
    if (g.error) throw new Error(`Groupes illisibles : ${g.error.message}`);
    const m = await lireTout<{ group_id: string; user_id: string }>((de, a) => admin
      .from("group_members").select("group_id, user_id").in("group_id", gids).order("group_id").order("user_id").range(de, a));
    for (const x of (g.data ?? []) as { id: string; name: string | null }[]) {
      groupes.push({ id: x.id, nom: (x.name ?? "").trim() || "Groupe", membres: m.lignes.filter((l) => l.group_id === x.id).map((l) => l.user_id) });
    }
  }

  const qui = [...new Set([...groupes.flatMap((g) => g.membres), ...cours.map((x) => x.formateur_id).filter(Boolean) as string[]])];
  const personnes: Personne[] = [];
  for (const lot of paquets(qui, 100)) {
    // eslint-disable-next-line no-await-in-loop
    const r = await admin.from("users").select("id, nom, username, avatar_url, role, roles").in("id", lot);
    if (r.error) throw new Error(`Profils illisibles : ${r.error.message}`);
    personnes.push(...((r.data ?? []) as Personne[]));
  }
  // Progression : la vue du suivi (migration 095). Si elle est illisible, la classe s'affiche sans barres.
  let progres: { user_id: string; course_id: string; faites: number; total: number }[] = [];
  let progresComplet = true;
  try {
    const pr = await lireTout<{ user_id: string; course_id: string; lessons_done: number | null; lessons_total: number | null }>((de, a) => admin
      .from(VUE_INSCRIPTIONS).select("enrollment_id, user_id, course_id, lessons_done, lessons_total").in("course_id", ids).order("enrollment_id").range(de, a));
    progres = pr.lignes.map((l) => ({ user_id: l.user_id, course_id: l.course_id, faites: Number(l.lessons_done) || 0, total: Number(l.lessons_total) || 0 }));
    progresComplet = pr.complet;
  } catch { progres = []; }

  return { ...construireClasseEleve({ moi, cours, inscriptions: ins.lignes, personnes, progres, groupes }), complet: ins.complet && progresComplet };
}
