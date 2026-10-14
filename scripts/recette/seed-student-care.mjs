/**
 * Crée les données FICTIVES du suivi pédagogique dans le projet de RECETTE.
 *
 *   RECETTE_CONFIRME=oui RECETTE_SUPABASE_URL=… RECETTE_SERVICE_ROLE_KEY=… \
 *   RECETTE_ANON_KEY=… RECETTE_MOT_DE_PASSE_ELEVES=… \
 *     npx tsx scripts/recette/seed-student-care.mjs
 *
 * - Refuse toute cible qui n'est pas, de façon vérifiable, la recette (garde.mjs).
 * - N'utilise QUE les clés RECETTE_* (jamais celles de l'application).
 * - Comptes en @exemple.test, mot de passe de test fourni par RECETTE_MOT_DE_PASSE_ELEVES
 *   (jamais affiché) ; aucune donnée réelle, aucun e-mail envoyé (création admin
 *   avec e-mail déjà confirmé ; le projet de recette n'a ni Resend ni webhook push).
 * - Refuse de repasser sur une recette déjà remplie (pas de suppression).
 * - Insère les leçons AVANT les inscriptions : les déclencheurs « nouveau contenu »
 *   ne créent donc aucune notification.
 */

import { createClient } from "@supabase/supabase-js";
import { cibleRecette, cle } from "./garde.mjs";
import { COURS, QUIZ, scenarios, email } from "./scenarios.mjs";

const cible = cibleRecette();
const admin = createClient(cible.url, cle("RECETTE_SERVICE_ROLE_KEY"), { auth: { persistSession: false, autoRefreshToken: false } });
const anon = cle("RECETTE_ANON_KEY");
const motDePasse = cle("RECETTE_MOT_DE_PASSE_ELEVES");
if (motDePasse.length < 12) { console.error("⛔ RECETTE_MOT_DE_PASSE_ELEVES : 12 caractères minimum."); process.exit(3); }

const ok = (r, quoi) => {
  if (r.error) { console.error(`✖ ${quoi} : ${r.error.message}`); process.exit(1); }
  return r.data;
};

// Recette déjà remplie ? On n'écrase ni ne supprime rien.
const deja = ok(await admin.from("users").select("id").ilike("email", "recette+%@exemple.test").limit(1), "contrôle préalable");
if (deja.length) { console.error("⛔ Des élèves de recette existent déjà. Utilisez un projet de recette neuf (aucune suppression automatique)."); process.exit(3); }

const maintenant = new Date();
const { jourDebut, eleves } = scenarios(maintenant);
console.log(`Seed du ${maintenant.toISOString()} — date de début du suivi : ${jourDebut}`);

// 1) Catalogue : cours → chapitres → leçons (avant toute inscription).
const lecon = new Map(); // "N1:0:1" → id de leçon
const coursId = new Map();
for (const [cleCours, c] of Object.entries(COURS)) {
  const ligne = { slug: c.slug, titre_fr: c.titre_fr, titre_ar: c.titre_ar ?? null, published: true, prix_dzd: 0 };
  if (c.id) ligne.id = c.id;
  const cours = ok(await admin.from("courses").insert(ligne).select("id").single(), `cours ${cleCours}`);
  coursId.set(cleCours, cours.id);
  for (const [ch, nbLecons] of c.chapitres.entries()) {
    const chap = ok(await admin.from("chapters").insert({ course_id: cours.id, titre: `Chapitre ${ch + 1}`, ordre: ch + 1 }).select("id").single(), "chapitre");
    for (let le = 0; le < nbLecons; le += 1) {
      const l = ok(await admin.from("lessons").insert({ chapter_id: chap.id, titre: `${c.titre_fr} — leçon ${ch + 1}.${le + 1}`, ordre: le + 1 }).select("id").single(), "leçon");
      lecon.set(`${cleCours}:${ch}:${le}`, l.id);
    }
  }
}
const quizId = new Map();
for (const q of QUIZ) {
  const r = ok(await admin.from("quizzes").insert({ lesson_id: lecon.get(`${q.cours}:${q.ch}:${q.le}`), title: `Quiz ${q.cle} (recette)`, type: "lesson_end", max_attempts: q.max }).select("id").single(), "quiz");
  quizId.set(q.cle, r.id);
}
console.log(`✔ catalogue : ${coursId.size} cours, ${lecon.size} leçons, ${quizId.size} quiz`);

// 2) Élèves et leurs traces.
const L = (x) => lecon.get(`${x.cours}:${x.ch}:${x.le}`);
for (const e of eleves) {
  const u = ok(await admin.auth.admin.createUser({ email: email(e.cle), password: motDePasse, email_confirm: true, user_metadata: { nom: `Élève recette ${e.cle}` } }), `compte ${e.cle}`).user;
  if (e.role !== "eleve") ok(await admin.from("users").update({ role: e.role, roles: [e.role, "eleve"] }).eq("id", u.id), "rôle");
  for (const i of e.inscriptions) {
    ok(await admin.from("enrollments").insert({ user_id: u.id, course_id: coursId.get(i.cours), paid_at: i.le, enrolled_at: i.le, amount: 0, currency: "DZD" }), "inscription");
  }
  for (const p of e.progres) ok(await admin.from("progress").insert({ user_id: u.id, lesson_id: L(p), completed_at: p.at }), "progression");
  for (const v of e.videos) ok(await admin.from("video_progress").insert({ user_id: u.id, lesson_id: L(v), last_position_sec: v.pct * 6, duration_sec: 600, watched_pct: v.pct, watched_complete: false, updated_at: v.at }), "vidéo");
  for (const q of e.quiz) {
    const n = e.quiz.filter((x) => x.quiz === q.quiz && x.at <= q.at).length;
    ok(await admin.from("quiz_attempts").insert({ quiz_id: quizId.get(q.quiz), student_id: u.id, score: q.score, passed: q.passed, attempt_number: n, created_at: q.at }), "quiz");
  }
  for (const t of e.travaux) ok(await admin.from("lesson_practicals").insert({ user_id: u.id, lesson_id: L(t), note: "Travail fictif (recette)", status: t.statut, created_at: t.at, reviewed_at: t.revu ?? null }), "travail");
  for (const q of e.questions) ok(await admin.from("lesson_questions").insert({ user_id: u.id, lesson_id: L(q), content: "Question fictive (recette)", created_at: q.at }), "question");
  for (const c of e.certificats) ok(await admin.from("certificates").insert({ user_id: u.id, course_id: coursId.get(c.cours), issued_at: c.at }), "certificat");
  for (const a of e.abonnements) ok(await admin.from("course_subscriptions").insert({ user_id: u.id, course_id: coursId.get(a.cours), status: "active", total_months: 3, installments_paid: 1, monthly_amount_dzd: 1000, next_due_date: a.echeance }), "abonnement");
  for (const r of e.reactivations) ok(await admin.from("reactivation_log").insert({ user_id: u.id, stage: r.stage, sent_at: r.at }), "relance");
  if (e.connectee) {
    // Vraie connexion (mot de passe de test) : pose last_sign_in_at côté Auth.
    const c = createClient(cible.url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
    ok(await c.auth.signInWithPassword({ email: email(e.cle), password: motDePasse }), `connexion ${e.cle}`);
  }
}
console.log(`✔ ${eleves.length} élèves fictives créées`);

// 3) Date de début du suivi (réglage de la recette).
ok(await admin.from("student_care_settings").upsert({ id: 1, start_date: jourDebut, thresholds: {}, updated_at: new Date().toISOString() }, { onConflict: "id" }), "réglages");
console.log("✔ réglages du suivi posés. Lancer la vérification le MÊME JOUR (heure d'Alger) : les attendus dépendent de la date.");
