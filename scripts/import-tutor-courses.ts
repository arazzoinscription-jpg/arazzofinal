/**
 * Script de migration JSON cours TutorLMS → Supabase
 *
 * Usage:
 *   npm run migrate:courses -- --file=courses.json
 *
 * Format JSON attendu (export TutorLMS):
 * [
 *   {
 *     "title": "Caftan Marocain",
 *     "description": "...",
 *     "price": 2500,
 *     "currency": "DZD",
 *     "level": "beginner",
 *     "duration": "8h",
 *     "thumbnail": "https://...",
 *     "chapters": [
 *       {
 *         "title": "Introduction",
 *         "lessons": [
 *           { "title": "Bienvenue", "video_url": "https://iframe.mediadelivery.net/...", "duration": 5 }
 *         ]
 *       }
 *     ]
 *   }
 * ]
 */

import fs from "fs";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function slugify(str: string) {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    + "-" + Date.now();
}

const levelMap: Record<string, string> = {
  beginner: "debutant",
  intermediate: "intermediaire",
  advanced: "avance",
  debutant: "debutant",
  intermediaire: "intermediaire",
  avance: "avance",
};

async function importCourses() {
  const args = process.argv.slice(2);
  const fileArg = args.find((a) => a.startsWith("--file="));
  const formateurArg = args.find((a) => a.startsWith("--formateur="));
  const filePath = fileArg ? fileArg.split("=")[1] : "courses.json";
  const formateurId = formateurArg ? formateurArg.split("=")[1] : null;

  if (!fs.existsSync(filePath)) {
    console.error(`❌ Fichier introuvable: ${filePath}`);
    process.exit(1);
  }

  if (!formateurId) {
    console.error("❌ --formateur=<uuid> requis");
    process.exit(1);
  }

  const courses = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  console.log(`📂 ${courses.length} cours trouvés`);

  let imported = 0;
  let failed = 0;

  for (const course of courses) {
    try {
      const { data: inserted, error } = await supabase
        .from("courses")
        .insert({
          titre_fr: course.title,
          slug: slugify(course.title),
          description_fr: course.description,
          prix_dzd: course.currency === "DZD" ? course.price : 0,
          prix_eur: course.currency === "EUR" ? course.price : 0,
          niveau: levelMap[course.level] ?? "debutant",
          duree: course.duration,
          thumbnail: course.thumbnail,
          formateur_id: formateurId,
          published: false, // Review before publishing
        })
        .select()
        .single();

      if (error || !inserted) {
        console.error(`❌ ${course.title}: ${error?.message}`);
        failed++;
        continue;
      }

      // Import chapters and lessons
      for (let ci = 0; ci < (course.chapters ?? []).length; ci++) {
        const ch = course.chapters[ci];
        const { data: chapter } = await supabase
          .from("chapters")
          .insert({ course_id: inserted.id, titre: ch.title, ordre: ci + 1 })
          .select()
          .single();

        if (chapter) {
          for (let li = 0; li < (ch.lessons ?? []).length; li++) {
            const l = ch.lessons[li];
            await supabase.from("lessons").insert({
              chapter_id: chapter.id,
              titre: l.title,
              video_url_bunny: l.video_url,
              duree_minutes: l.duration,
              ordre: li + 1,
              is_preview: li === 0, // First lesson free preview
            });
          }
        }
      }

      console.log(`✅ "${course.title}" importé (brouillon)`);
      imported++;
    } catch (err) {
      console.error(`💥 ${course.title}:`, err);
      failed++;
    }
  }

  console.log(`\n📊 Résumé:`);
  console.log(`  ✅ Importés : ${imported}`);
  console.log(`  ❌ Échecs : ${failed}`);
  console.log(`\n⚠️  Tous les cours sont en brouillon. Vérifiez et publiez depuis /formateur`);
}

importCourses();
