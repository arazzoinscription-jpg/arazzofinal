import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getRoles } from "@/lib/roles";
import { lireParIds, lireTout } from "@/lib/student-care/paginate";
import { estInscriteSelon } from "./regles";
import { leconEssai, niveauDuTest } from "./load";
import { fusionnerCoursGratuits, type CoursGratuit, type InstantaneCours, type LeadCours } from "./annuaire";

type Admin = SupabaseClient;

export type CompteVisiteuse = {
  id: string; nom: string | null; email: string | null; username: string | null; ville: string | null; pays: string | null;
  avatar_url: string | null; created_at: string; role: string | null; roles: string[] | null;
};

/** Ce que la connexion (Supabase Auth) sait d'un compte : dates exactes et coordonnées laissées à l'inscription. */
export type InfosConnexion = {
  creeLe: string | null; derniereConnexion: string | null; emailConfirmeLe: string | null;
  telephone: string | null; wilaya: string | null; source: string | null; typeCompte: string | null;
};

const COLONNES_COMPTE = "id, nom, email, username, ville, pays, avatar_url, created_at, role, roles";

/** Tous les comptes SANS formation ni rôle d'équipe (lecture complète, au-delà de 1 000 comptes). */
export async function toutesLesVisiteuses(admin: Admin): Promise<{ visiteuses: CompteVisiteuse[]; complet: boolean }> {
  const [comptes, inscriptions] = await Promise.all([
    lireTout<CompteVisiteuse>((de, a) => admin.from("users").select(COLONNES_COMPTE).eq("role", "eleve").order("id").range(de, a)),
    lireTout<{ user_id: string }>((de, a) => admin.from("enrollments").select("user_id, id").order("id").range(de, a)),
  ]);
  const avecFormation = new Set(inscriptions.lignes.map((e) => e.user_id));
  const visiteuses = comptes.lignes.filter((u) => !estInscriteSelon({ roles: getRoles(u), inscriptions: avecFormation.has(u.id) ? 1 : 0 }));
  return { visiteuses, complet: comptes.complet && inscriptions.complet };
}

/** Les cours gratuits en ligne et fermés (quelques dizaines d'instantanés au plus). */
export async function instantanesCours(admin: Admin): Promise<InstantaneCours[]> {
  const { lignes } = await lireTout<InstantaneCours>((de, a) => admin.from("delivery_page_snapshots").select("slug, data").order("slug").range(de, a));
  return lignes;
}

type LeadBrut = LeadCours & { email: string | null };

/** Les inscriptions aux cours gratuits, rangées par e-mail (en minuscules, comme à l'enregistrement). */
export async function inscriptionsCoursParEmail(admin: Admin, emails: (string | null)[]): Promise<Map<string, LeadBrut[]>> {
  const propres = [...new Set(emails.map((e) => (e ?? "").trim().toLowerCase()).filter(Boolean))];
  const lignes = await lireParIds<LeadBrut>(propres, (lot, de, a) => admin
    .from("delivery_page_leads").select("id, slug, email, phone, wilaya, source, created_at").in("email", lot).order("id").range(de, a));
  const out = new Map<string, LeadBrut[]>();
  for (const l of lignes) {
    const cle = (l.email ?? "").toLowerCase();
    out.set(cle, [...(out.get(cle) ?? []), l]);
  }
  return out;
}

/** Les cours gratuits d'une personne (par son e-mail) : seulement ceux dont elle a rempli le formulaire. */
export async function coursGratuitsDe(admin: Admin, email: string | null | undefined): Promise<CoursGratuit[]> {
  const [leads, instantanes] = await Promise.all([inscriptionsCoursParEmail(admin, [email ?? null]), instantanesCours(admin)]);
  return fusionnerCoursGratuits(leads.get((email ?? "").trim().toLowerCase()) ?? [], instantanes);
}

export async function infosConnexion(admin: Admin, id: string): Promise<InfosConnexion> {
  try {
    const { data } = await admin.auth.admin.getUserById(id);
    const u = data.user;
    const m = (u?.user_metadata ?? {}) as Record<string, unknown>;
    const t = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
    return {
      creeLe: u?.created_at ?? null, derniereConnexion: u?.last_sign_in_at ?? null, emailConfirmeLe: u?.email_confirmed_at ?? null,
      telephone: t(m.phone) ?? t(u?.phone), wilaya: t(m.wilaya), source: t(m.source), typeCompte: t(m.account_type),
    };
  } catch {
    return { creeLe: null, derniereConnexion: null, emailConfirmeLe: null, telephone: null, wilaya: null, source: null, typeCompte: null };
  }
}

/** La dernière page vue (statistiques du site), ou null. */
async function derniereVisite(admin: Admin, id: string): Promise<string | null> {
  const { data } = await admin.from("page_visits").select("created_at").eq("user_id", id).order("created_at", { ascending: false }).limit(1);
  return ((data ?? []) as { created_at: string }[])[0]?.created_at ?? null;
}

export type LigneAnnuaire = CompteVisiteuse & { connexion: InfosConnexion; cours: CoursGratuit[]; derniereVisite: string | null };

/** Les détails des comptes d'UNE page de la liste (connexion, cours gratuits, dernière visite). */
export async function detaillerAnnuaire(admin: Admin, comptes: CompteVisiteuse[]): Promise<LigneAnnuaire[]> {
  const [connexions, visites, leads, instantanes] = await Promise.all([
    Promise.all(comptes.map((c) => infosConnexion(admin, c.id))),
    Promise.all(comptes.map((c) => derniereVisite(admin, c.id).catch(() => null))),
    inscriptionsCoursParEmail(admin, comptes.map((c) => c.email)).catch(() => new Map<string, LeadBrut[]>()),
    instantanesCours(admin).catch(() => [] as InstantaneCours[]),
  ]);
  return comptes.map((c, i) => {
    const siens = leads.get((c.email ?? "").toLowerCase()) ?? [];
    const premier = siens[0];
    const connexion = connexions[i];
    return {
      ...c,
      // Le téléphone et la wilaya laissés sur le formulaire d'un cours gratuit complètent ceux du compte.
      connexion: { ...connexion, telephone: connexion.telephone ?? premier?.phone ?? null, wilaya: connexion.wilaya ?? premier?.wilaya ?? null },
      cours: fusionnerCoursGratuits(siens, instantanes),
      derniereVisite: visites[i],
    };
  });
}

export type ProfilVisiteuse = {
  compte: CompteVisiteuse;
  connexion: InfosConnexion;
  inscrite: boolean;
  cours: CoursGratuit[];
  sources: string[];
  essai: { titre: string; cours: string; vue: boolean } | null;
  test: { fait: boolean; libelle: string | null };
  cour: { publications: number; enAttente: number; commentaires: number; jaime: number; stories: number; envies: number };
  visites: { path: string; created_at: string; duration_sec: number | null; device: string | null }[];
};

const compter = async (q: PromiseLike<{ count: number | null; error: unknown }>) => {
  try { const r = await q; return r.error ? 0 : r.count ?? 0; } catch { return 0; }
};

/** Tout ce que la fiche d'une visiteuse affiche ; null si le compte n'existe pas. */
export async function chargerProfilVisiteuse(admin: Admin, id: string): Promise<ProfilVisiteuse | null> {
  const { data: compte } = await admin.from("users").select(COLONNES_COMPTE).eq("id", id).maybeSingle();
  if (!compte) return null;
  const c = compte as CompteVisiteuse;
  const tete = { count: "exact" as const, head: true };
  const [connexion, nbInscriptions, leads, instantanes, essai, test, visites, publications, enAttente, commentaires, jaime, stories, envies] = await Promise.all([
    infosConnexion(admin, id),
    compter(admin.from("enrollments").select("id", tete).eq("user_id", id)),
    inscriptionsCoursParEmail(admin, [c.email]).catch(() => new Map<string, LeadBrut[]>()),
    instantanesCours(admin).catch(() => [] as InstantaneCours[]),
    leconEssai(admin, id).catch(() => null),
    niveauDuTest(admin, c.email).catch(() => ({ fait: false, niveau: null, libelle: null })),
    admin.from("page_visits").select("path, created_at, duration_sec, device").eq("user_id", id).order("created_at", { ascending: false }).limit(60)
      .then((r) => ((r.data ?? []) as ProfilVisiteuse["visites"]), () => [] as ProfilVisiteuse["visites"]),
    compter(admin.from("posts").select("id", tete).eq("author_id", id)),
    compter(admin.from("posts").select("id", tete).eq("author_id", id).eq("a_valider", true)),
    compter(admin.from("comments").select("id", tete).eq("author_id", id)),
    compter(admin.from("likes").select("id", tete).eq("user_id", id)),
    compter(admin.from("stories").select("id", tete).eq("user_id", id)),
    compter(admin.from("feed_envies").select("media_id", tete).eq("user_id", id)),
  ]);
  const siens = leads.get((c.email ?? "").toLowerCase()) ?? [];
  const premier = [...siens].sort((a, b) => a.created_at.localeCompare(b.created_at))[0];
  return {
    compte: c,
    connexion: { ...connexion, telephone: connexion.telephone ?? premier?.phone ?? null, wilaya: connexion.wilaya ?? premier?.wilaya ?? null },
    inscrite: estInscriteSelon({ roles: getRoles(c), inscriptions: nbInscriptions }),
    cours: fusionnerCoursGratuits(siens, instantanes),
    sources: [...new Set([connexion.source, ...siens.map((l) => l.source)].filter((s): s is string => Boolean(s)))],
    essai: essai ? { titre: essai.titre, cours: essai.cours, vue: essai.vue } : null,
    test: { fait: test.fait, libelle: test.libelle },
    cour: { publications, enAttente, commentaires, jaime, stories, envies },
    visites,
  };
}
