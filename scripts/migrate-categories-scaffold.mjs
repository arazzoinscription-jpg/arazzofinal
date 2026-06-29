// Migration idempotente — ossature de sous-catégories pour les univers VIDES.
//
// Contexte : en base, seul « Modélisme » est structuré (Femme/Homme/Enfants →
// Niveaux, + Patron numérique) et porte des cours. Les 6 autres univers
// (Stylisme, Artisanat, Accessoire, Modélisme industriel, Prêt-à-porter,
// Haute couture) sont vides. Ce script leur ajoute une ossature de niveau 2.
//
// SÛR : n'insère une sous-catégorie que si son slug n'existe pas déjà
// (idempotent — relançable). NE TOUCHE PAS à Modélisme ni aux cours.
//
// Lancer :   node scripts/migrate-categories-scaffold.mjs           (aperçu, dry-run)
//            node scripts/migrate-categories-scaffold.mjs --apply   (écrit en base)
//   Annuler :node scripts/migrate-categories-scaffold.mjs --rollback (supprime UNIQUEMENT
//            les sous-catégories créées par ce script et restées sans cours)

import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = fs.readFileSync(".env.local", "utf8").split("\n").reduce((a, l) => {
  const m = l.match(/^([A-Z_]+)=(.*)$/);
  if (m) a[m[1]] = m[2].replace(/^['"]|['"]$/g, "");
  return a;
}, {});
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const APPLY = process.argv.includes("--apply");
const ROLLBACK = process.argv.includes("--rollback");

// slug d'univers (parent) -> sous-catégories [slug, name_fr, name_ar]
const SCAFFOLD = {
  stylisme: [
    ["stylisme-dessin-de-mode", "Dessin de mode", "رسم الموضة"],
    ["stylisme-matieres-couleurs", "Matières & couleurs", "الأقمشة والألوان"],
    ["stylisme-collection", "Conception de collection", "تصميم المجموعة"],
  ],
  artisanat: [
    ["artisanat-broderie-main", "Broderie main", "التطريز اليدوي"],
    ["artisanat-perlage", "Perlage & strass", "التخريز والأحجار"],
    ["artisanat-fetla-medjboud", "Fetla & medjboud", "الفتلة والمجبود"],
    ["artisanat-finitions", "Finitions à la main", "اللمسات اليدوية"],
  ],
  accessoire: [
    ["accessoire-sacs", "Sacs & pochettes", "الحقائب"],
    ["accessoire-ceintures", "Ceintures", "الأحزمة"],
    ["accessoire-chapeaux", "Chapeaux & coiffes", "القبعات"],
  ],
  "modelisme-industriel": [
    ["mi-gradation", "Gradation industrielle", "التدريج الصناعي"],
    ["mi-dossier-technique", "Dossier technique", "الملف التقني"],
    ["mi-cao", "Patronage numérique (CAO)", "الباترون الرقمي"],
  ],
  "pret-a-porter": [
    ["pap-femme", "Femme", "نساء"],
    ["pap-homme", "Homme", "رجال"],
    ["pap-enfants", "Enfants", "أطفال"],
  ],
  "haute-couture": [
    ["hc-drapage-moulage", "Drapage & moulage", "الدرابيه والتشكيل"],
    ["hc-corsetterie", "Corsetterie & structure", "البنية والكورسيه"],
    ["hc-finitions-main", "Finitions main", "اللمسات اليدوية الراقية"],
  ],
};

const all = Object.values(SCAFFOLD).flat().map((s) => s[0]);

async function main() {
  const { data: cats, error } = await sb.from("categories").select("id, slug, parent_id");
  if (error) throw error;
  const bySlug = Object.fromEntries(cats.map((c) => [c.slug, c]));

  if (ROLLBACK) {
    const { data: cc } = await sb.from("course_categories").select("category_id");
    const withCourses = new Set((cc || []).map((r) => r.category_id));
    const toDelete = cats.filter((c) => all.includes(c.slug) && !withCourses.has(c.id));
    console.log(`Rollback : ${toDelete.length} sous-catégorie(s) créée(s) par ce script, sans cours.`);
    if (APPLY && toDelete.length) {
      const { error: delErr } = await sb.from("categories").delete().in("id", toDelete.map((c) => c.id));
      if (delErr) throw delErr;
      console.log("Supprimées.");
    } else if (toDelete.length) {
      console.log("(dry-run — ajoutez --apply pour supprimer)");
    }
    return;
  }

  const rows = [];
  for (const [parentSlug, subs] of Object.entries(SCAFFOLD)) {
    const parent = bySlug[parentSlug];
    if (!parent) { console.log(`! univers introuvable: ${parentSlug} (ignoré)`); continue; }
    subs.forEach(([slug, name_fr, name_ar], i) => {
      if (bySlug[slug]) { console.log(`skip (existe) ${slug}`); return; }
      rows.push({ parent_id: parent.id, slug, name_fr, name_ar, ordre: i + 1 });
    });
  }

  console.log(`${rows.length} sous-catégorie(s) à insérer :`);
  rows.forEach((r) => console.log(`  + ${r.slug}  «${r.name_fr}»`));
  if (!rows.length) { console.log("Rien à faire (déjà en place)."); return; }

  if (!APPLY) { console.log("\n(dry-run — ajoutez --apply pour écrire en base)"); return; }
  const { error: insErr } = await sb.from("categories").insert(rows);
  if (insErr) throw insErr;
  console.log(`\n${rows.length} sous-catégorie(s) insérée(s).`);
}

main().catch((e) => { console.error("ÉCHEC:", e.message); process.exit(1); });
