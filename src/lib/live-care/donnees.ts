/**
 * Lives pédagogiques — lecture et écriture des données (client fourni par l'appelant).
 *
 * Écritures AUTORISÉES, et seulement celles-ci :
 *   live_series, live_sessions, live_session_courses, live_reminders (plans de rappel),
 *   session_reminders (VERROU anti-doublon du cron existant — voir verrouillerCronExistant).
 * Aucun envoi : aucun e-mail, aucune notification, aucun WhatsApp, aucun push.
 *
 * PostgREST n'offre pas de transaction : chaque étape est idempotente (contraintes
 * uniques + upsert « ignorer les doublons »), on peut donc relancer sans doublon.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { NIVEAUX } from "../niveaux";
import { NIVEAU_PAR_COURS, type CodeNiveau } from "../student-care/levels";
import { lireTout, paquets } from "../student-care/paginate";
import { suiviPourEleves } from "../student-care/read";
import type { Seuils, SuiviEleve } from "../student-care/rules";
import { occurrenceUnique, occurrencesHebdo, planSerie, type Occurrence } from "./recurrence";
import { reconcilier, fenetreCronExistant, type Canal, type Moment, type RegleRappel, type StatutRappel } from "./rappels";
import type { SaisieLive } from "./saisie";
import type { PreuveExistante } from "./statuts";
import { dateLongue, heureAlger, heureCourte, instantAlger, jourAlger } from "./temps";

type Client = SupabaseClient;

export const T = {
  lives: "live_sessions", series: "live_series", liens: "live_session_courses",
  rappels: "live_reminders", verrous: "session_reminders",
} as const;

const COLONNES_LIVE = "id, titre, description, starts_at, duree_minutes, meet_url, replay_url, course_id, formateur_id, series_id, occurrence_date, occurrence_modifiee, cancelled_at, cancel_reason, rappels, created_via, is_live, audience, created_at";
const COLONNES_RAPPEL = "id, session_id, moment, decalage_minutes, canal, prevu_le, statut, envoye_le, fournisseur_id, erreur";

export interface LigneLive {
  id: string; titre: string; description: string | null; starts_at: string; duree_minutes: number | null;
  meet_url: string | null; replay_url: string | null; course_id: string | null; formateur_id: string;
  series_id: string | null; occurrence_date: string | null; occurrence_modifiee: boolean;
  cancelled_at: string | null; cancel_reason: string | null; rappels: RegleRappel[] | null;
  created_via: string | null; is_live: boolean; audience: string | null; created_at: string;
}
export interface LigneSerie {
  id: string; titre: string; description: string | null; heure_alger: string; duree_minutes: number;
  date_debut: string; date_fin: string; lien: string | null; course_ids: string[]; rappels: RegleRappel[];
  formateur_id: string | null; cancelled_at: string | null; cancel_reason: string | null;
}
export interface LigneRappel {
  id: string; session_id: string; moment: Moment; decalage_minutes: number; canal: Canal; prevu_le: string;
  statut: StatutRappel; envoye_le: string | null; fournisseur_id: string | null; erreur: string | null;
}
export interface LiveComplet { live: LigneLive; cours: string[]; rappels: LigneRappel[]; serie: LigneSerie | null }

export class ErreurLives extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ErreurLives";
  }
}

function ok<D>(r: { data: D | null; error: { message: string } | null }, quoi: string): D {
  if (r.error) throw new ErreurLives(`${quoi} : ${r.error.message}`);
  return r.data as D;
}

export { migrationAbsente } from "./repli";

/** Violation d'une contrainte unique (Postgres 23505). */
function estDoublon(err: { message: string; code?: string }): boolean {
  return err.code === "23505" || /duplicate key/i.test(err.message);
}

export async function etatMigration(admin: Client): Promise<string | null> {
  const r = await admin.from(T.series).select("id").limit(1);
  if (r.error) return r.error.message;
  const s = await admin.from(T.lives).select("cancelled_at, series_id, duree_minutes").limit(1);
  return s.error ? s.error.message : null;
}

// ─── Lecture ────────────────────────────────────────────────────────────────

export interface CoursNiveau { id: string; code: CodeNiveau; titre: string; formateur_id: string | null }

/** Les trois cours de niveau (src/lib/niveaux.ts). */
export async function coursNiveaux(admin: Client): Promise<CoursNiveau[]> {
  const ids = Object.values(NIVEAUX);
  const rows = ok(await admin.from("courses").select("id, titre_fr, formateur_id").in("id", ids), "cours de niveau") as { id: string; titre_fr: string; formateur_id: string | null }[];
  return rows
    .map((c) => ({ id: c.id, code: NIVEAU_PAR_COURS.get(c.id) as CodeNiveau, titre: c.titre_fr, formateur_id: c.formateur_id }))
    .filter((c) => c.code)
    .sort((a, b) => a.code.localeCompare(b.code));
}

async function completer(admin: Client, lives: LigneLive[]): Promise<LiveComplet[]> {
  const ids = lives.map((l) => l.id);
  const cours = new Map<string, string[]>();
  const rappels = new Map<string, LigneRappel[]>();
  for (const lot of paquets(ids, 100)) {
    // eslint-disable-next-line no-await-in-loop
    const li = await lireTout<{ session_id: string; course_id: string }>((de, a) => admin.from(T.liens).select("session_id, course_id").in("session_id", lot).order("session_id").order("course_id").range(de, a));
    for (const x of li.lignes) cours.set(x.session_id, [...(cours.get(x.session_id) ?? []), x.course_id]);
    // eslint-disable-next-line no-await-in-loop
    const ra = await lireTout<LigneRappel>((de, a) => admin.from(T.rappels).select(COLONNES_RAPPEL).in("session_id", lot).order("prevu_le").order("id").range(de, a));
    for (const x of ra.lignes) rappels.set(x.session_id, [...(rappels.get(x.session_id) ?? []), x]);
  }
  const serieIds = [...new Set(lives.map((l) => l.series_id).filter(Boolean))] as string[];
  const series = new Map<string, LigneSerie>();
  if (serieIds.length) {
    const rows = ok(await admin.from(T.series).select("*").in("id", serieIds), "séries") as LigneSerie[];
    for (const s of rows) series.set(s.id, s);
  }
  return lives.map((l) => ({
    live: l,
    cours: cours.get(l.id) ?? (l.course_id ? [l.course_id] : []),
    rappels: rappels.get(l.id) ?? [],
    serie: l.series_id ? series.get(l.series_id) ?? null : null,
  }));
}

/** Lives dont le début tombe dans [de, a[ (instants ISO). */
export async function lireLivesPeriode(admin: Client, deIso: string, aIso: string): Promise<{ lives: LiveComplet[]; complet: boolean }> {
  const r = await lireTout<LigneLive>((de, a) => admin.from(T.lives).select(COLONNES_LIVE)
    .gte("starts_at", deIso).lt("starts_at", aIso).order("starts_at").order("id").range(de, a));
  return { lives: await completer(admin, r.lignes), complet: r.complet };
}

export async function lireLive(admin: Client, id: string): Promise<LiveComplet | null> {
  const r = await admin.from(T.lives).select(COLONNES_LIVE).eq("id", id).maybeSingle();
  const live = ok(r, "live") as LigneLive | null;
  return live ? (await completer(admin, [live]))[0] : null;
}

async function occurrencesDeSerie(admin: Client, serieId: string): Promise<LigneLive[]> {
  return (await lireTout<LigneLive>((de, a) => admin.from(T.lives).select(COLONNES_LIVE).eq("series_id", serieId).order("starts_at").order("id").range(de, a))).lignes;
}

// ─── Écriture (briques) ─────────────────────────────────────────────────────

async function poserLiens(admin: Client, sessionIds: string[], courseIds: string[]) {
  for (const lot of paquets(sessionIds, 100)) {
    // eslint-disable-next-line no-await-in-loop
    ok(await admin.from(T.liens).delete().in("session_id", lot), "niveaux (remplacement)");
    // eslint-disable-next-line no-await-in-loop
    ok(await admin.from(T.liens).insert(lot.flatMap((s) => courseIds.map((c) => ({ session_id: s, course_id: c })))), "niveaux");
  }
}

/** Aligne les rappels planifiés d'un live sur ses règles. Rend les règles écartées (avec raison). */
async function planifierRappels(admin: Client, live: { id: string; starts_at: string; duree_minutes: number; annule: boolean }, regles: RegleRappel[], existants: LigneRappel[], maintenant: Date): Promise<string[]> {
  const plan = reconcilier(existants, regles, live, maintenant);
  const horodatage = maintenant.toISOString();
  if (plan.aCreer.length) {
    ok(await admin.from(T.rappels).upsert(
      plan.aCreer.map((r) => ({ session_id: live.id, moment: r.moment, decalage_minutes: r.decalage_minutes, canal: r.canal, prevu_le: r.prevu_le, statut: "prevu" })),
      { onConflict: "session_id,moment,decalage_minutes,canal", ignoreDuplicates: true },
    ), "rappels (création)");
  }
  for (const x of plan.aReplanifier) {
    // eslint-disable-next-line no-await-in-loop
    ok(await admin.from(T.rappels).update({ prevu_le: x.prevu_le, statut: "prevu", updated_at: horodatage }).eq("id", x.id).in("statut", ["prevu", "annule"]), "rappels (replanification)");
  }
  if (plan.aAnnuler.length) {
    ok(await admin.from(T.rappels).update({ statut: "annule", updated_at: horodatage }).in("id", plan.aAnnuler).eq("statut", "prevu"), "rappels (annulation)");
  }
  return plan.ecartes.map((e) => e.raison);
}

/**
 * VERROU du cron existant (`/api/cron/session-reminders`) : ce cron enregistre
 * (live, « j1 » / « h1 ») AVANT d'envoyer, et saute tout live déjà enregistré.
 * Poser ces deux lignes pour un live géré ici l'empêche d'envoyer des rappels en
 * double — et, pour un live ANNULÉ, d'envoyer quoi que ce soit — SANS modifier le
 * cron. (Décision à confirmer avant la production : voir le rapport.)
 */
async function verrouillerCronExistant(admin: Client, sessionIds: string[]) {
  if (!sessionIds.length) return;
  ok(await admin.from(T.verrous).upsert(
    sessionIds.flatMap((id) => [{ session_id: id, stage: "j1" }, { session_id: id, stage: "h1" }]),
    { onConflict: "session_id,stage", ignoreDuplicates: true },
  ), "verrou du cron existant");
}

export interface Contexte { userId: string; maintenant: Date; niveaux: CoursNiveau[] }
export interface Resultat { ids: string[]; ecartes: string[]; alertes: string[] }

function alertesCron(startsAt: string[]): string[] {
  const n = startsAt.filter((s) => { const f = fenetreCronExistant(s); return f.veille || f.heure; }).length;
  return n
    ? [`${n} live(s) tombent dans la fenêtre du cron existant (08:00 UTC) : son envoi J-1/H-1 est bloqué par le verrou anti-doublon.`]
    : [];
}

function animatrice(s: SaisieLive, ctx: Contexte): string {
  return ctx.niveaux.find((n) => n.id === s.course_ids[0])?.formateur_id ?? ctx.userId;
}

function ligneLive(s: SaisieLive, o: Occurrence, ctx: Contexte, serieId: string | null) {
  return {
    formateur_id: animatrice(s, ctx),
    titre: s.titre,
    description: s.description,
    starts_at: o.starts_at,
    duree_minutes: s.duree_minutes,
    meet_url: s.lien,
    course_id: s.course_ids[0],
    series_id: serieId,
    occurrence_date: serieId ? o.occurrence_date : null,
    rappels: s.rappels,
    created_via: "admin_lives",
    updated_at: ctx.maintenant.toISOString(),
  };
}

// ─── Créer ──────────────────────────────────────────────────────────────────

export async function creerLives(admin: Client, s: SaisieLive, ctx: Contexte): Promise<Resultat> {
  const now = ctx.maintenant.getTime();
  const toutes = s.recurrence === "hebdo"
    ? occurrencesHebdo({ dateDebut: s.jour, dateFin: s.jour_fin as string, heure: s.heure })
    : [occurrenceUnique(s.jour, s.heure)];
  const futures = toutes.filter((o) => new Date(o.starts_at).getTime() > now);
  if (!futures.length) throw new ErreurLives("Ce live (ou toute la série) est déjà passé : rien à programmer.");

  // Anti double-envoi du formulaire (double clic, page renvoyée) : même titre, même instant,
  // déjà programmé ici et non annulé → rien n'est créé. L'index unique de la 096 tient le cas concurrent.
  for (const lot of paquets(futures.map((o) => o.starts_at), 100)) {
    // eslint-disable-next-line no-await-in-loop
    const deja = ok(await admin.from(T.lives).select("starts_at").eq("created_via", "admin_lives").is("cancelled_at", null)
      .eq("titre", s.titre).in("starts_at", lot).limit(1), "contrôle des doublons") as { starts_at: string }[];
    if (deja.length) throw new ErreurLives(`Déjà programmé : « ${s.titre} » existe déjà le ${dateLongue(deja[0].starts_at)} à ${heureCourte(deja[0].starts_at)} (formulaire envoyé deux fois ?). Rien n'a été créé en double.`);
  }

  let serieId: string | null = null;
  if (s.recurrence === "hebdo") {
    const serie = ok(await admin.from(T.series).insert({
      titre: s.titre, description: s.description, heure_alger: s.heure, duree_minutes: s.duree_minutes,
      date_debut: s.jour, date_fin: s.jour_fin, lien: s.lien, course_ids: s.course_ids, rappels: s.rappels,
      formateur_id: animatrice(s, ctx), created_by: ctx.userId,
    }).select("id").single(), "série") as { id: string };
    serieId = serie.id;
  }

  const lignes = futures.map((o) => ligneLive(s, o, ctx, serieId));
  const r = serieId
    ? await admin.from(T.lives).upsert(lignes, { onConflict: "series_id,occurrence_date", ignoreDuplicates: true }).select("id, starts_at")
    : await admin.from(T.lives).insert(lignes).select("id, starts_at");
  if (r.error) {
    // Rien de créé : la série vide ne doit pas rester orpheline.
    if (serieId) await admin.from(T.series).delete().eq("id", serieId);
    if (estDoublon(r.error)) throw new ErreurLives(`Déjà programmé : « ${s.titre} » existe déjà à cette date et cette heure. Rien n'a été créé en double.`);
  }
  const crees = ok(r, serieId ? "lives" : "live") as { id: string; starts_at: string }[];

  const ids = crees.map((c) => c.id);
  await poserLiens(admin, ids, s.course_ids);
  await verrouillerCronExistant(admin, ids);
  const ecartes = new Set<string>();
  for (const c of crees) {
    // eslint-disable-next-line no-await-in-loop
    for (const e of await planifierRappels(admin, { id: c.id, starts_at: c.starts_at, duree_minutes: s.duree_minutes, annule: false }, s.rappels, [], ctx.maintenant)) ecartes.add(e);
  }
  const alertes = alertesCron(crees.map((c) => c.starts_at));
  if (toutes.length > futures.length) alertes.push(`${toutes.length - futures.length} date(s) déjà passée(s) : non créée(s).`);
  return { ids, ecartes: [...ecartes], alertes };
}

// ─── Modifier ───────────────────────────────────────────────────────────────

export async function modifierLive(admin: Client, id: string, s: SaisieLive, portee: "occurrence" | "serie", ctx: Contexte): Promise<Resultat> {
  const actuel = await lireLive(admin, id);
  if (!actuel) throw new ErreurLives("Live introuvable.");
  if (actuel.live.cancelled_at) throw new ErreurLives("Ce live est annulé : il ne peut plus être modifié.");
  const horodatage = ctx.maintenant.toISOString();

  if (portee === "occurrence" || !actuel.serie) {
    const startsAt = instantAlger(s.jour, s.heure);
    ok(await admin.from(T.lives).update({
      titre: s.titre, description: s.description, starts_at: startsAt, duree_minutes: s.duree_minutes,
      meet_url: s.lien, course_id: s.course_ids[0], rappels: s.rappels,
      occurrence_modifiee: Boolean(actuel.live.series_id), updated_at: horodatage,
    }).eq("id", id), "live");
    await poserLiens(admin, [id], s.course_ids);
    const ecartes = await planifierRappels(admin, { id, starts_at: startsAt, duree_minutes: s.duree_minutes, annule: false }, s.rappels, actuel.rappels, ctx.maintenant);
    return { ids: [id], ecartes, alertes: alertesCron([startsAt]) };
  }

  // Toute la série (le jour de la semaine reste celui de la 1re date ; on règle heure, durée, fin, contenu).
  const serie = actuel.serie;
  ok(await admin.from(T.series).update({
    titre: s.titre, description: s.description, heure_alger: s.heure, duree_minutes: s.duree_minutes,
    date_fin: s.jour_fin ?? serie.date_fin, lien: s.lien, course_ids: s.course_ids, rappels: s.rappels, updated_at: horodatage,
  }).eq("id", serie.id), "série");
  const voulues = occurrencesHebdo({ dateDebut: serie.date_debut, dateFin: s.jour_fin ?? serie.date_fin, heure: s.heure });
  // Dates de la règle AVANT modification : une date qui en faisait partie et dont la ligne a
  // disparu a été supprimée volontairement → elle n'est pas recréée.
  const anciennes = new Set(occurrencesHebdo({ dateDebut: serie.date_debut, dateFin: serie.date_fin, heure: serie.heure_alger }).map((o) => o.occurrence_date));
  const existantes = await occurrencesDeSerie(admin, serie.id);
  const plan = planSerie(existantes.map((e) => ({
    id: e.id, occurrence_date: e.occurrence_date as string, starts_at: e.starts_at, cancelled_at: e.cancelled_at, occurrence_modifiee: e.occurrence_modifiee,
  })), voulues, ctx.maintenant, anciennes);

  const ids: string[] = [];
  for (const m of plan.aMettreAJour) {
    // eslint-disable-next-line no-await-in-loop
    ok(await admin.from(T.lives).update({ ...ligneLive(s, m.occurrence, ctx, serie.id), updated_at: horodatage }).eq("id", m.id).is("cancelled_at", null), "occurrence");
    ids.push(m.id);
  }
  if (plan.aCreer.length) {
    const crees = ok(await admin.from(T.lives).upsert(plan.aCreer.map((o) => ligneLive(s, o, ctx, serie.id)), { onConflict: "series_id,occurrence_date", ignoreDuplicates: true }).select("id"), "nouvelles occurrences") as { id: string }[];
    ids.push(...crees.map((c) => c.id));
    await verrouillerCronExistant(admin, crees.map((c) => c.id));
  }
  if (plan.aAnnuler.length) await annulerIds(admin, plan.aAnnuler, "Retirée de la série", ctx.maintenant);
  await poserLiens(admin, ids, s.course_ids);
  const ecartes = new Set<string>();
  const apres = await occurrencesDeSerie(admin, serie.id);
  const rappelsActuels = (await completer(admin, apres.filter((l) => ids.includes(l.id))));
  for (const c of rappelsActuels) {
    // eslint-disable-next-line no-await-in-loop
    for (const e of await planifierRappels(admin, { id: c.live.id, starts_at: c.live.starts_at, duree_minutes: s.duree_minutes, annule: false }, s.rappels, c.rappels, ctx.maintenant)) ecartes.add(e);
  }
  const alertes = alertesCron(rappelsActuels.map((c) => c.live.starts_at));
  if (plan.annuleesConservees.length) alertes.push(`${plan.annuleesConservees.length} occurrence(s) annulée(s) à la main : laissée(s) annulée(s).`);
  if (plan.modifieesConservees.length) alertes.push(`${plan.modifieesConservees.length} occurrence(s) modifiée(s) à la main : non écrasée(s).`);
  if (plan.supprimeesRespectees.length) alertes.push(`${plan.supprimeesRespectees.length} date(s) supprimée(s) hors de ce module (${plan.supprimeesRespectees.join(", ")}) : non recréée(s).`);
  return { ids, ecartes: [...ecartes], alertes };
}

// ─── Annuler ────────────────────────────────────────────────────────────────

async function annulerIds(admin: Client, ids: string[], raison: string, maintenant: Date) {
  const horodatage = maintenant.toISOString();
  for (const lot of paquets(ids, 100)) {
    // eslint-disable-next-line no-await-in-loop
    ok(await admin.from(T.lives).update({ cancelled_at: horodatage, cancel_reason: raison, updated_at: horodatage }).in("id", lot).is("cancelled_at", null), "annulation");
    // eslint-disable-next-line no-await-in-loop
    ok(await admin.from(T.rappels).update({ statut: "annule", updated_at: horodatage }).in("session_id", lot).eq("statut", "prevu"), "rappels annulés");
  }
  await verrouillerCronExistant(admin, ids);
}

export async function annulerLive(admin: Client, id: string, portee: "occurrence" | "serie", raison: string, ctx: Contexte): Promise<Resultat> {
  const actuel = await lireLive(admin, id);
  if (!actuel) throw new ErreurLives("Live introuvable.");
  const motif = raison.trim().slice(0, 300) || "Annulé par l'administration";
  if (portee === "serie" && actuel.serie) {
    const now = ctx.maintenant.getTime();
    const futures = (await occurrencesDeSerie(admin, actuel.serie.id))
      .filter((l) => !l.cancelled_at && new Date(l.starts_at).getTime() > now).map((l) => l.id);
    await annulerIds(admin, futures, motif, ctx.maintenant);
    ok(await admin.from(T.series).update({ cancelled_at: ctx.maintenant.toISOString(), cancel_reason: motif }).eq("id", actuel.serie.id), "série annulée");
    return { ids: futures, ecartes: [], alertes: [] };
  }
  if (actuel.live.cancelled_at) return { ids: [], ecartes: [], alertes: ["Ce live était déjà annulé."] };
  await annulerIds(admin, [id], motif, ctx.maintenant);
  return { ids: [id], ecartes: [], alertes: [] };
}

// ─── Élèves concernées ──────────────────────────────────────────────────────

export interface EleveConcernee {
  suivi: SuiviEleve;
  niveaux: string[];
  /** null = inconnu ; false = désinscrite des e-mails « Annonces » (ou catégorie coupée par l'admin). */
  email_autorise: boolean | null;
  preuve: PreuveExistante;
}

const echapperLike = (s: string) => s.replace(/[\\%_]/g, (c) => `\\${c}`);

export async function elevesConcernees(admin: Client, l: LiveComplet, { seuils, maintenant }: { seuils: Seuils; maintenant: Date }): Promise<{ eleves: EleveConcernee[]; complet: boolean; global: boolean }> {
  const global = l.cours.length === 0;
  const inscr = global
    ? await lireTout<{ user_id: string; course_id: string }>((de, a) => admin.from("enrollments").select("user_id, course_id").order("id").range(de, a))
    : await lireTout<{ user_id: string; course_id: string }>((de, a) => admin.from("enrollments").select("user_id, course_id").in("course_id", l.cours).order("id").range(de, a));
  const coursParEleve = new Map<string, Set<string>>();
  for (const e of inscr.lignes) coursParEleve.set(e.user_id, (coursParEleve.get(e.user_id) ?? new Set()).add(e.course_id));
  const ids = [...coursParEleve.keys()];
  const { suivis, complet } = await suiviPourEleves(admin, ids, { seuils, maintenant });

  const cfg = await admin.from("platform_config").select("email_categories").eq("id", 1).maybeSingle();
  const categorieCoupee = ((cfg.data as { email_categories?: Record<string, boolean> } | null)?.email_categories ?? {}).announcements === false;
  const prefs = new Map<string, boolean>();
  const preuves = new Map<string, PreuveExistante>();
  // Traces du cron existant pour CETTE occurrence : envoyées entre 30 h avant et 2 h après le début.
  const fenetreDe = new Date(new Date(l.live.starts_at).getTime() - 30 * 3_600_000).toISOString();
  const fenetreA = new Date(new Date(l.live.starts_at).getTime() + 2 * 3_600_000).toISOString();
  const motif = `%: ${echapperLike(l.live.titre)}`;
  for (const lot of paquets(ids, 100)) {
    /* eslint-disable no-await-in-loop */
    const p = ok(await admin.from("email_preferences").select("user_id, announcements").in("user_id", lot), "préférences e-mail") as { user_id: string; announcements: boolean }[];
    for (const x of p) prefs.set(x.user_id, x.announcements !== false);
    const n = ok(await admin.from("notifications").select("user_id, created_at").eq("type", "session").in("user_id", lot)
      .ilike("title", motif).gte("created_at", fenetreDe).lte("created_at", fenetreA), "notifications") as { user_id: string; created_at: string }[];
    const m = ok(await admin.from("email_log").select("user_id, created_at, status").eq("category", "announcements").in("user_id", lot)
      .ilike("subject", motif).gte("created_at", fenetreDe).lte("created_at", fenetreA), "journal e-mail") as { user_id: string; created_at: string; status: PreuveExistante["email_statut"] }[];
    /* eslint-enable no-await-in-loop */
    for (const x of n) {
      const cur = preuves.get(x.user_id) ?? { notification_le: null, email_le: null, email_statut: null };
      if (!cur.notification_le || x.created_at > cur.notification_le) cur.notification_le = x.created_at;
      preuves.set(x.user_id, cur);
    }
    for (const x of m) {
      const cur = preuves.get(x.user_id) ?? { notification_le: null, email_le: null, email_statut: null };
      if (!cur.email_le || x.created_at > cur.email_le) { cur.email_le = x.created_at; cur.email_statut = x.status; }
      preuves.set(x.user_id, cur);
    }
  }
  const eleves: EleveConcernee[] = [];
  for (const [id, s] of suivis) {
    eleves.push({
      suivi: s,
      niveaux: [...(coursParEleve.get(id) ?? [])].map((c) => NIVEAU_PAR_COURS.get(c) ?? "autre"),
      email_autorise: categorieCoupee ? false : (prefs.has(id) ? prefs.get(id)! : null),
      preuve: preuves.get(id) ?? { notification_le: null, email_le: null, email_statut: null },
    });
  }
  eleves.sort((a, b) => a.suivi.nom.localeCompare(b.suivi.nom, "fr"));
  return { eleves, complet: complet && inscr.complet, global };
}

/** Pour les écrans : jour et heure d'Alger d'un live (pré-remplissage du formulaire de modification). */
export function jourEtHeure(startsAt: string): { jour: string; heure: string } {
  return { jour: jourAlger(startsAt), heure: heureAlger(startsAt) };
}
