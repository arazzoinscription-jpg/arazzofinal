/**
 * Script one-shot : réorganise les inscriptions migrées de l'ancien système
 * en regroupant les modules 1-9 sous NIVEAU 1 et les modules 10-12 sous NIVEAU 2.
 *
 * Usage:
 *   node scripts/organize-student-levels.mjs
 *
 * Le script est idempotent : relancer ne crée pas de doublons.
 * Les inscriptions aux modules individuels sont conservées.
 */

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

const LEVELS = [
  {
    slug: "niveau-1-bases-vetements-quotidiens",
    titre_fr: "Niveau 1 — Bases & Vêtements Quotidiens",
    titre_ar: "المستوى الأول — الأساسيات و الملابس اليومية",
    desc_fr: "Le socle du modélisme : outils, prise de mesures, patron de base, machines, manches, jupe, pantalon, modèles maison et hijab.",
    desc_ar: "أساسيات المودلاج: الأدوات، أخذ المقاسات، الباترون الأساسي، الماكينات، الأكمام، التنورة، السروال، موديلات البيت و الحجابات.",
    moduleNums: [1, 2, 3, 4, 5, 6, 7, 8, 9],
    prix_dzd: 8000,
    prix_eur: 53,
    niveau: "debutant",
  },
  {
    slug: "niveau-2-classique-soiree",
    titre_fr: "Niveau 2 — Classique & Soirée",
    titre_ar: "المستوى الثاني — الكلاسيك و الصواري",
    desc_fr: "Vêtements classiques et tenues de soirée : pinces et découpes, manteaux et cols classiques, extraction des pièces de soirée.",
    desc_ar: "الملابس الكلاسيكية و ملابس الصواري: البانسات و القصات، المعاطف و الياقات الكلاسيكية، استخراج قطع الصواري بطريقة الباترون.",
    moduleNums: [10, 11, 12],
    prix_dzd: 8000,
    prix_eur: 53,
    niveau: "intermediaire",
  },
];

/** Extrait le numéro de module depuis le titre (ex: "المحور 3"). */
function parseModuleNum(title) {
  const m = String(title || "").match(/المحور\s*(\d+)/i);
  return m ? parseInt(m[1], 10) : null;
}

async function main() {
  // ── 1) Charger tous les cours et identifier modules + niveaux ─────────────
  const { data: courses, error: coursesErr } = await supabase
    .from("courses")
    .select("id, slug, titre_fr, formateur_id, published");
  if (coursesErr) throw coursesErr;

  const courseById = new Map((courses || []).map((c) => [c.id, c]));

  const moduleByNum = new Map();
  for (const c of courses || []) {
    const num = parseModuleNum(c.titre_fr);
    if (num && num >= 1 && num <= 12) {
      moduleByNum.set(num, c.id);
    }
  }

  if (moduleByNum.size === 0) {
    console.log("⚠️ Aucun module (المحور N) détecté. Rien à faire.");
    return;
  }
  console.log(`📚 ${moduleByNum.size} modules détectés : ${[...moduleByNum.keys()].sort((a, b) => a - b).join(", ")}`);

  const levelCourses = [];
  for (const lvl of LEVELS) {
    let course = (courses || []).find((c) => c.slug === lvl.slug);

    if (!course) {
      const formateurId = (courses || []).find((c) => c.formateur_id)?.formateur_id || null;
      const { data: inserted, error } = await supabase
        .from("courses")
        .insert({
          titre_fr: lvl.titre_fr,
          titre_ar: lvl.titre_ar,
          slug: lvl.slug,
          description_fr: lvl.desc_fr,
          description_ar: lvl.desc_ar,
          prix_dzd: lvl.prix_dzd,
          prix_eur: lvl.prix_eur,
          niveau: lvl.niveau,
          formateur_id: formateurId,
          published: true,
        })
        .select()
        .single();
      if (error) {
        console.error(`❌ Impossible de créer ${lvl.titre_fr}:`, error.message);
        continue;
      }
      course = inserted;
      console.log(`✅ Cours créé : ${lvl.titre_fr}`);
    } else {
      console.log(`✅ Cours existant : ${lvl.titre_fr}`);
    }

    levelCourses.push({ ...lvl, courseId: course.id, formateurId: course.formateur_id });
  }

  // ── 2) Charger toutes les inscriptions aux modules ────────────────────────
  const moduleCourseIds = [...moduleByNum.values()];
  const { data: moduleEnrolls, error: enrErr } = await supabase
    .from("enrollments")
    .select("user_id, course_id, paid_at")
    .in("course_id", moduleCourseIds);
  if (enrErr) throw enrErr;

  // ── 3) Déterminer les niveaux manquants par élève ─────────────────────────
  const byStudent = new Map(); // userId -> { niveaux: Set<levelCourseId>, dateMin: ISO }
  for (const e of moduleEnrolls || []) {
    const course = courseById.get(e.course_id);
    const num = parseModuleNum(course?.titre_fr);
    if (!num) continue;

    const levelsForModule = levelCourses.filter((lvl) => lvl.moduleNums.includes(num));
    for (const lvl of levelsForModule) {
      if (!byStudent.has(e.user_id)) {
        byStudent.set(e.user_id, { niveaux: new Set(), dateMin: e.paid_at });
      }
      const s = byStudent.get(e.user_id);
      s.niveaux.add(lvl.courseId);
      if (e.paid_at && new Date(e.paid_at) < new Date(s.dateMin || "9999-12-31")) {
        s.dateMin = e.paid_at;
      }
    }
  }

  console.log(`\n👤 ${byStudent.size} élève(s) avec modules à regrouper`);

  // ── 4) Créer les inscriptions de niveau manquantes ────────────────────────
  let created = 0;
  let skipped = 0;
  let failed = 0;

  for (const [userId, { niveaux, dateMin }] of byStudent) {
    for (const levelCourseId of niveaux) {
      const lvl = levelCourses.find((l) => l.courseId === levelCourseId);
      if (!lvl) continue;

      const { data: existing } = await supabase
        .from("enrollments")
        .select("id")
        .eq("user_id", userId)
        .eq("course_id", levelCourseId)
        .maybeSingle();

      if (existing) {
        skipped++;
        continue;
      }

      const { error } = await supabase.from("enrollments").insert({
        user_id: userId,
        course_id: levelCourseId,
        paid_at: dateMin || new Date().toISOString(),
        amount: 0,
        currency: "DZD",
        formateur_id: lvl.formateurId,
      });

      if (error) {
        console.error(`❌ Erreur insertion ${userId} → ${lvl.titre_fr}:`, error.message);
        failed++;
      } else {
        created++;
      }
    }
  }

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`✅ Inscriptions niveaux créées : ${created}`);
  console.log(`⏭️  Déjà existantes : ${skipped}`);
  if (failed) console.log(`❌ Échecs : ${failed}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
