import type { SupabaseClient } from "@supabase/supabase-js";
import { lireTout, paquets, ErreurLecture } from "./paginate";
import {
  calculerSuivi, calculerTous, lireSeuils,
  type EntreeEleve, type InfoAuth, type LigneInscription, type LigneSignaux, type Profil,
  type Seuils, type SuiviEleve, type Telephone,
} from "./rules";
import { dateCourte, minuitAlgerIso } from "./time";

/**
 * Suivi pédagogique — LECTURE seule des données du LMS.
 *
 * Tout passe par le client serveur (service_role) : les vues et la table de
 * réglages de la migration 095 sont fermées à `anon` et `authenticated`.
 * Aucune écriture ici, aucun envoi de message.
 *
 * Le client est FOURNI par l'appelant : l'application passe par `load.ts`
 * (protégé par `server-only`), le script de recette passe un client pointé sur
 * le projet de recette — c'est ainsi le MÊME code qui est vérifié.
 *
 * Chaque lecture d'ensemble est paginée (`lireTout`) et triée sur une clé
 * unique ; les filtres `in.(…)` sont découpés par paquets de 100 identifiants.
 */

export const VUE_INSCRIPTIONS = "student_care_enrollments";
/**
 * « Toutes les inscriptions », quelle que soit leur date : « Ma classe » montre TOUTES les élèves inscrites
 * (le suivi pédagogique, lui, garde sa date de début pour ses relances).
 */
export const DEBUT_TOUTES = "1970-01-01";
export const VUE_SIGNAUX = "student_care_signals";
export const TABLE_REGLAGES = "student_care_settings";

const PAQUET = 100;

type Client = SupabaseClient;

export interface Reglages {
  start_date: string | null;
  seuils: Seuils;
  updated_at: string | null;
}

export type EtatReglages =
  | { ok: true; reglages: Reglages }
  | { ok: false; raison: "migration_absente" | "erreur"; message: string };

/** Table ou vue absente (migration 095 non appliquée). */
function objetAbsent(err: { code?: string; message?: string } | null): boolean {
  if (!err) return false;
  return err.code === "42P01" || err.code === "PGRST205"
    || /does not exist|Could not find the (table|relation)/i.test(err.message ?? "");
}

export async function lireReglages(admin: Client): Promise<EtatReglages> {
  const { data, error } = await admin
    .from(TABLE_REGLAGES).select("start_date, thresholds, updated_at").eq("id", 1).maybeSingle();
  if (error) {
    return { ok: false, raison: objetAbsent(error) ? "migration_absente" : "erreur", message: error.message };
  }
  const r = data as { start_date?: string | null; thresholds?: unknown; updated_at?: string | null } | null;
  return {
    ok: true,
    reglages: { start_date: r?.start_date ?? null, seuils: lireSeuils(r?.thresholds), updated_at: r?.updated_at ?? null },
  };
}

// ─── Comptes (Supabase Auth) ────────────────────────────────────────────────

type UtilisateurAuth = {
  id: string;
  last_sign_in_at?: string | null;
  app_metadata?: { status?: string } | null;
  banned_until?: string | null;
};

function statutCompte(u: UtilisateurAuth, maintenant: Date): InfoAuth["statut"] {
  const s = u.app_metadata?.status;
  if (s === "veille" || s === "bloque") return s;
  if (u.banned_until && new Date(u.banned_until).getTime() > maintenant.getTime()) return "bloque";
  return "actif";
}

/** Comptes Auth des élèves voulues — pages de 1 000, jusqu'à une page vide. */
async function lireComptes(admin: Client, ids: Set<string>, maintenant: Date): Promise<{ comptes: Map<string, InfoAuth>; complet: boolean }> {
  const comptes = new Map<string, InfoAuth>();
  for (let page = 1; page <= 200; page += 1) {
    // eslint-disable-next-line no-await-in-loop
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new ErreurLecture(`Comptes : ${error.message}`);
    const users = (data?.users ?? []) as UtilisateurAuth[];
    if (users.length === 0) return { comptes, complet: true };
    for (const u of users) {
      if (ids.has(u.id)) comptes.set(u.id, { last_sign_in_at: u.last_sign_in_at ?? null, statut: statutCompte(u, maintenant) });
    }
  }
  return { comptes, complet: false };
}

// ─── Téléphones (le profil LMS n'en a pas : on cite la source) ───────────────

async function lireTelephones(admin: Client, profils: Profil[]): Promise<{ telephones: Map<string, Telephone>; complet: boolean }> {
  const telephones = new Map<string, Telephone>();
  let complet = true;
  const ids = profils.map((p) => p.id);
  const idParEmail = new Map<string, string>();
  for (const p of profils) if (p.email) idParEmail.set(p.email.trim().toLowerCase(), p.id);
  const poser = (id: string | undefined, valeur: unknown, source: string) => {
    const v = String(valeur ?? "").trim();
    if (id && v && !telephones.has(id)) telephones.set(id, { valeur: v, source });
  };

  // 1) Commande la plus récente.
  for (const lot of paquets(ids, PAQUET)) {
    // eslint-disable-next-line no-await-in-loop
    const r = await lireTout<{ customer_id: string; phone: string; created_at: string }>((de, a) => admin
      .from("orders").select("id, customer_id, phone, created_at")
      .in("customer_id", lot).not("phone", "is", null)
      .order("created_at", { ascending: false }).order("id").range(de, a));
    complet &&= r.complet;
    for (const o of r.lignes) poser(o.customer_id, o.phone, `commande du ${dateCourte(o.created_at)}`);
  }
  // 2) Dossier de diplôme.
  for (const lot of paquets(ids.filter((id) => !telephones.has(id)), PAQUET)) {
    // eslint-disable-next-line no-await-in-loop
    const r = await lireTout<{ user_id: string; phone: string }>((de, a) => admin
      .from("diplomas").select("id, user_id, phone, updated_at")
      .in("user_id", lot).not("phone", "is", null)
      .order("updated_at", { ascending: false }).order("id").range(de, a));
    complet &&= r.complet;
    for (const d of r.lignes) poser(d.user_id, d.phone, "dossier de diplôme");
  }
  // 3) Demandes laissées sur le site (correspondance EXACTE de l'adresse e-mail).
  const sources: [string, string][] = [["enrollment_requests", "demande d'enrôlement"], ["online_enrollment_leads", "formulaire d'inscription en ligne"]];
  for (const [table, libelle] of sources) {
    const emails = [...idParEmail.entries()].filter(([, id]) => !telephones.has(id)).map(([e]) => e);
    for (const lot of paquets(emails, PAQUET)) {
      // eslint-disable-next-line no-await-in-loop
      const r = await lireTout<{ email: string; phone: string; created_at: string }>((de, a) => admin
        .from(table).select("id, email, phone, created_at")
        .in("email", lot).not("phone", "is", null)
        .order("created_at", { ascending: false }).order("id").range(de, a));
      complet &&= r.complet;
      for (const x of r.lignes) poser(idParEmail.get(String(x.email).trim().toLowerCase()), x.phone, `${libelle} du ${dateCourte(x.created_at)}`);
    }
  }
  return { telephones, complet };
}

// ─── Assemblage ─────────────────────────────────────────────────────────────

const COLONNES_PROFIL = "id, nom, email, username, ville, pays, role, created_at";

async function lireEntrees(admin: Client, ids: string[], maintenant: Date): Promise<{ entrees: EntreeEleve[]; complet: boolean; ecartees: number }> {
  let complet = true;
  const inscriptions = new Map<string, LigneInscription[]>();
  const signaux = new Map<string, LigneSignaux>();
  const profils: Profil[] = [];

  for (const lot of paquets(ids, PAQUET)) {
    /* eslint-disable no-await-in-loop */
    const ins = await lireTout<LigneInscription>((de, a) => admin
      .from(VUE_INSCRIPTIONS).select("*").in("user_id", lot).order("enrollment_id").range(de, a));
    const sig = await lireTout<LigneSignaux>((de, a) => admin
      .from(VUE_SIGNAUX).select("*").in("user_id", lot).order("user_id").range(de, a));
    const pro = await lireTout<Profil>((de, a) => admin
      .from("users").select(COLONNES_PROFIL).in("id", lot).order("id").range(de, a));
    /* eslint-enable no-await-in-loop */
    complet &&= ins.complet && sig.complet && pro.complet;
    for (const l of ins.lignes) {
      const liste = inscriptions.get(l.user_id) ?? [];
      liste.push(l);
      inscriptions.set(l.user_id, liste);
    }
    for (const s of sig.lignes) signaux.set(s.user_id, s);
    profils.push(...pro.lignes);
  }

  // Seuls les comptes « élève », comme dans les pages admin existantes.
  const eleves = profils.filter((p) => p.role === "eleve");
  const comptes = await lireComptes(admin, new Set(eleves.map((p) => p.id)), maintenant);
  const tel = await lireTelephones(admin, eleves);
  complet &&= comptes.complet && tel.complet;

  return {
    entrees: eleves.map((p) => ({
      profil: p,
      auth: comptes.comptes.get(p.id) ?? null,
      signaux: signaux.get(p.id) ?? null,
      inscriptions: inscriptions.get(p.id) ?? [],
      telephone: tel.telephones.get(p.id) ?? null,
    })),
    complet,
    ecartees: profils.length - eleves.length,
  };
}

export interface ResultatSuivi {
  eleves: SuiviEleve[];
  complet: boolean;
  avertissements: string[];
  calcule_le: string;
}

/** Toutes les élèves suivies depuis `jourDebut` (minuit heure d'Alger). */
export async function chargerSuivi(
  admin: Client,
  { jourDebut, seuils, maintenant }: { jourDebut: string; seuils: Seuils; maintenant: Date },
): Promise<ResultatSuivi> {
  const debutIso = minuitAlgerIso(jourDebut);
  const toutes = jourDebut <= DEBUT_TOUTES;
  const suivies = await lireTout<{ enrollment_id: string; user_id: string }>((de, a) => {
    const q = admin.from(VUE_INSCRIPTIONS).select("enrollment_id, user_id");
    return (toutes ? q : q.gte("paid_at", debutIso)).order("enrollment_id").range(de, a);
  });
  const ids = [...new Set(suivies.lignes.map((l) => l.user_id))];
  const { entrees, complet, ecartees } = await lireEntrees(admin, ids, maintenant);

  const avertissements: string[] = [];
  if (!(suivies.complet && complet)) {
    avertissements.push("Lecture incomplète : le garde-fou de pagination a été atteint. La liste ci-dessous n'est PAS exhaustive.");
  }
  if (ecartees > 0) avertissements.push(`${ecartees} compte(s) non « élève » (formatrice, admin…) inscrit(s) sur la période : non affiché(s).`);

  return {
    eleves: calculerTous(entrees, { jourDebut, maintenant, seuils }),
    complet: suivies.complet && complet,
    avertissements,
    calcule_le: maintenant.toISOString(),
  };
}

/**
 * Le suivi (statut, action recommandée…) d'une liste précise d'élèves, toutes
 * inscriptions confondues — pour d'autres écrans (ex. élèves concernées par un live).
 * Mêmes règles que le tableau ; seuls les comptes « élève » sont rendus.
 */
export async function suiviPourEleves(
  admin: Client,
  ids: string[],
  { seuils, maintenant }: { seuils: Seuils; maintenant: Date },
): Promise<{ suivis: Map<string, SuiviEleve>; complet: boolean }> {
  const { entrees, complet } = await lireEntrees(admin, [...new Set(ids)], maintenant);
  const suivis = new Map<string, SuiviEleve>();
  for (const e of entrees) {
    const s = calculerSuivi(e, { debutIso: "1970-01-01T00:00:00.000Z", maintenant, seuils });
    if (s) suivis.set(e.profil.id, s);
  }
  return { suivis, complet };
}

export interface DetailEleve {
  suivi: SuiviEleve;
  /** Vrai si l'élève n'a aucune inscription depuis la date de suivi (affichée quand même). */
  hors_periode: boolean;
  reactivations: { stage: string; sent_at: string }[];
  rappels: { kind: string; sent_at: string; lecon: string | null }[];
  notifications: { type: string; title: string; created_at: string; read_at: string | null }[];
  emails: { category: string; subject: string | null; status: string; created_at: string }[];
}

/** Fiche d'une élève : mêmes règles que le tableau + historique des relances et envois DÉJÀ enregistrés. */
export async function chargerEleve(
  admin: Client,
  userId: string,
  { jourDebut, seuils, maintenant }: { jourDebut: string; seuils: Seuils; maintenant: Date },
): Promise<DetailEleve | null> {
  const { entrees } = await lireEntrees(admin, [userId], maintenant);
  const entree = entrees[0];
  if (!entree || entree.inscriptions.length === 0) return null;

  let hors_periode = false;
  let suivi = calculerSuivi(entree, { debutIso: minuitAlgerIso(jourDebut), maintenant, seuils });
  if (!suivi) {
    hors_periode = true;
    suivi = calculerSuivi(entree, { debutIso: "1970-01-01T00:00:00.000Z", maintenant, seuils });
  }
  if (!suivi) return null;

  const [rea, rap, notif, mails] = await Promise.all([
    admin.from("reactivation_log").select("stage, sent_at").eq("user_id", userId).order("sent_at", { ascending: false }).limit(10),
    admin.from("learning_reminders").select("kind, sent_at, lesson:lessons(titre)").eq("user_id", userId).order("sent_at", { ascending: false }).limit(10),
    admin.from("notifications").select("type, title, created_at, read_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(5),
    admin.from("email_log").select("category, subject, status, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(5),
  ]);
  for (const r of [rea, rap, notif, mails]) if (r.error) throw new ErreurLecture(r.error.message);

  return {
    suivi,
    hors_periode,
    reactivations: (rea.data ?? []) as DetailEleve["reactivations"],
    rappels: ((rap.data ?? []) as { kind: string; sent_at: string; lesson: { titre?: string } | { titre?: string }[] | null }[])
      .map((r) => ({ kind: r.kind, sent_at: r.sent_at, lecon: (Array.isArray(r.lesson) ? r.lesson[0]?.titre : r.lesson?.titre) ?? null })),
    notifications: (notif.data ?? []) as DetailEleve["notifications"],
    emails: (mails.data ?? []) as DetailEleve["emails"],
  };
}
