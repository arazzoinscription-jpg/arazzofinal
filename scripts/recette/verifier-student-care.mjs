/**
 * Vérifie le suivi pédagogique sur le projet de RECETTE (lecture seule, hors
 * tentatives d'accès refusées attendues).
 *
 *   RECETTE_CONFIRME=oui RECETTE_SUPABASE_URL=… RECETTE_DATABASE_URL=… \
 *   RECETTE_SERVICE_ROLE_KEY=… RECETTE_ANON_KEY=… RECETTE_MOT_DE_PASSE_ELEVES=… \
 *     npx tsx scripts/recette/verifier-student-care.mjs
 *
 * 1. Contrôles SQL (scripts/sql/student-care-checks.sql) : [vide] = 0 ligne attendue.
 * 2. Le VRAI chargeur de la page (src/lib/student-care/read.ts) contre la recette :
 *    pagination au-delà de 1 000 inscriptions, statuts et actions attendus par scénario.
 * 3. Permissions : clé publique et compte élève REFUSÉS sur les vues et les réglages ;
 *    service_role (témoin) autorisé.
 * 4. Aucun envoi : nombre de notifications / e-mails / abonnements push inchangé.
 * Code de sortie ≠ 0 au moindre écart.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import pg from "pg";
import { createClient } from "@supabase/supabase-js";
import { cibleRecette, cle } from "./garde.mjs";
import { scenarios, email } from "./scenarios.mjs";
import { chargerSuivi, lireReglages } from "../../src/lib/student-care/read.ts";

const cible = cibleRecette({ base: true });
const cleService = cle("RECETTE_SERVICE_ROLE_KEY");
const cleAnon = cle("RECETTE_ANON_KEY");
const motDePasse = cle("RECETTE_MOT_DE_PASSE_ELEVES");
const ecarts = [];
const note = (bon, texte) => { console.log(`${bon ? "  ✔" : "  ✖"} ${texte}`); if (!bon) ecarts.push(texte); };

const db = new pg.Client({ connectionString: process.env.RECETTE_DATABASE_URL, ssl: { rejectUnauthorized: false } });
await db.connect();
const envois = async () => (await db.query(
  "SELECT (SELECT count(*) FROM public.notifications) AS notifications, (SELECT count(*) FROM public.email_log) AS emails, (SELECT count(*) FROM public.push_subscriptions) AS push",
)).rows[0];
const avant = await envois();

try {
  // ── 1. Contrôles SQL ──
  console.log("\n1. Contrôles SQL");
  const sql = readFileSync(join(process.cwd(), "scripts", "sql", "student-care-checks.sql"), "utf8");
  for (const bloc of sql.split(/^-- @controle /m).slice(1)) {
    const [entete] = bloc.split("\n");
    const m = entete.match(/^(\S+) \[(vide|info)\] : (.*)$/);
    if (!m) continue;
    const { rows } = await db.query(`-- ${bloc}`); // l'en-tête redevient un commentaire SQL
    if (m[2] === "info") console.log(`  ℹ ${m[1]} — ${m[3]}\n${JSON.stringify(rows, null, 0).slice(0, 1500)}`);
    else note(rows.length === 0, `${m[1]} — ${m[3]}${rows.length ? ` : ${rows.length} écart(s) ${JSON.stringify(rows.slice(0, 5))}` : ""}`);
  }

  // ── 2. Le chargeur réel ──
  console.log("\n2. Chargeur de la page (read.ts) contre la recette");
  const admin = createClient(cible.url, cleService, { auth: { persistSession: false, autoRefreshToken: false } });
  const etat = await lireReglages(admin);
  note(etat.ok, `réglages lisibles par service_role${etat.ok ? "" : ` : ${etat.message}`}`);
  if (etat.ok && etat.reglages.start_date) {
    const { jourDebut, eleves, suiviesAttendues } = scenarios(new Date());
    note(jourDebut === etat.reglages.start_date, `date de début cohérente avec le seed (${etat.reglages.start_date})${jourDebut === etat.reglages.start_date ? "" : " — vérification lancée un autre jour que le seed : attendus non fiables"}`);
    const { rows: [{ n }] } = await db.query("SELECT count(*)::int AS n FROM public.enrollments WHERE paid_at >= $1", [new Date(`${etat.reglages.start_date}T00:00:00+01:00`).toISOString()]);
    note(n > 1000, `plus de 1 000 inscriptions suivies en base (${n}) : la pagination est réellement sollicitée`);
    const res = await chargerSuivi(admin, { jourDebut: etat.reglages.start_date, seuils: etat.reglages.seuils, maintenant: new Date() });
    note(res.complet, "lecture complète (aucun garde-fou de pagination atteint)");
    note(res.eleves.length === suiviesAttendues, `élèves suivies : ${res.eleves.length} (attendu ${suiviesAttendues})`);
    const parEmail = new Map(res.eleves.map((s) => [s.email, s]));
    for (const e of eleves) {
      const s = parEmail.get(email(e.cle));
      const a = e.attendu;
      if (a.suivie === false) { note(!s, `${e.cle} non suivie`); continue; }
      if (!s) { note(false, `${e.cle} absente du tableau`); continue; }
      const verifs = [];
      if (a.statut) verifs.push([s.statut === a.statut, `statut ${s.statut} (attendu ${a.statut})`]);
      if (a.action) verifs.push([s.action.code === a.action, `action ${s.action.code} (attendu ${a.action})`]);
      if (a.niveaux) verifs.push([JSON.stringify(s.niveaux) === JSON.stringify(a.niveaux), `niveaux ${s.niveaux} (attendu ${a.niveaux})`]);
      if (a.reference_pct !== undefined) verifs.push([s.reference?.pourcentage === a.reference_pct, `progression ${s.reference?.pourcentage} % (attendu ${a.reference_pct} %)`]);
      if (a.historique_lecons !== undefined) verifs.push([s.historique?.lecons_faites === a.historique_lecons, `historique ${s.historique?.lecons_faites} leçon(s) (attendu ${a.historique_lecons})`]);
      if (a.importee !== undefined) verifs.push([s.importee === a.importee, `importée ${s.importee}`]);
      if (a.etape) verifs.push([s.etape_terminee, "étape terminée"]);
      if (a.modules !== undefined) verifs.push([s.reference?.modules_faits === a.modules, `modules ${s.reference?.modules_faits} (attendu ${a.modules})`]);
      if (a.blocage) verifs.push([s.blocages.some((b) => b.code === a.blocage), `blocage ${a.blocage}`]);
      if (a.tache) verifs.push([s.taches_enseignante.some((t) => t.code === a.tache), `tâche ${a.tache}`]);
      if (a.a_corriger !== undefined) verifs.push([s.travaux.a_corriger === a.a_corriger, `à corriger ${s.travaux.a_corriger}`]);
      if (a.a_refaire !== undefined) verifs.push([s.travaux.a_refaire === a.a_refaire, `à refaire ${s.travaux.a_refaire}`]);
      const rates = verifs.filter(([bon]) => !bon);
      if (e.cle.startsWith("B") && e.cle !== "B01" && !rates.length) continue; // volume : on n'affiche que B01
      note(!rates.length, `${e.cle} : ${verifs.map(([, t]) => t).join(" · ")}`);
    }
  }

  // ── 3. Permissions ──
  console.log("\n3. Permissions");
  const eleve = createClient(cible.url, cleAnon, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: session, error: errSession } = await eleve.auth.signInWithPassword({ email: email("S04"), password: motDePasse });
  note(!errSession && Boolean(session?.session), "connexion d'une élève de test (S04)");
  const jetonEleve = session?.session?.access_token;
  const appel = async (objet, jeton, { methode = "GET", corps } = {}) => {
    const r = await fetch(`${cible.url}/rest/v1/${objet}${methode === "GET" ? "?select=*&limit=1" : "?id=eq.1"}`, {
      method: methode,
      headers: { apikey: cleAnon, Authorization: `Bearer ${jeton}`, "Content-Type": "application/json", Prefer: "return=representation" },
      body: corps ? JSON.stringify(corps) : undefined,
    });
    const texte = await r.text();
    let lignes = null;
    try { const j = JSON.parse(texte); lignes = Array.isArray(j) ? j.length : null; } catch { /* corps non JSON */ }
    return { statut: r.status, lignes };
  };
  for (const objet of ["student_care_enrollments", "student_care_signals", "student_care_settings"]) {
    const a = await appel(objet, cleAnon);
    note(a.statut >= 400 || a.lignes === 0, `${objet} refusé à la clé publique (HTTP ${a.statut})`);
    if (jetonEleve) {
      const b = await appel(objet, jetonEleve);
      note(b.statut >= 400 || b.lignes === 0, `${objet} refusé à un compte élève (HTTP ${b.statut})`);
    }
    const t = await fetch(`${cible.url}/rest/v1/${objet}?select=*&limit=1`, { headers: { apikey: cleService, Authorization: `Bearer ${cleService}` } });
    note(t.status === 200, `${objet} lisible par service_role (témoin, HTTP ${t.status})`);
  }
  if (jetonEleve) {
    const w = await appel("student_care_settings", jetonEleve, { methode: "PATCH", corps: { start_date: "2000-01-01" } });
    note(w.statut >= 400 || w.lignes === 0, `modification des réglages refusée à un compte élève (HTTP ${w.statut})`);
  }

  // ── 4. Aucun envoi ──
  console.log("\n4. Aucun envoi");
  const apres = await envois();
  note(JSON.stringify(avant) === JSON.stringify(apres), `notifications / e-mails / abonnements push inchangés (${JSON.stringify(apres)})`);
} finally {
  await db.end();
}

console.log(ecarts.length ? `\n✖ ${ecarts.length} écart(s). La migration n'est PAS validée.` : "\n✔ Aucun écart sur la recette.");
process.exit(ecarts.length ? 1 : 0);
