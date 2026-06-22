/**
 * Applique les titres propres FR/AR/EN aux cours + supprime les cours de test.
 *   node scripts/apply-course-titles.cjs           (dry-run : montre ce qui changerait)
 *   node scripts/apply-course-titles.cjs --execute  (applique)
 *
 * Le mapping est keyé par le titre_ar ACTUEL (exact). Nécessite la migration 036
 * (colonnes titre_en / description_en) appliquée au préalable.
 */
const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");
const e = fs.readFileSync(path.join(__dirname, "..", ".env.local"), "utf8");
const env = (k) => { const m = e.match(new RegExp("^" + k + "\\s*=\\s*(.+)$", "m")); return m ? m[1].trim().replace(/^["']|["']$/g, "") : null; };
const sb = createClient(env("NEXT_PUBLIC_SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"));

// titre_ar ACTUEL  →  { ar, fr, en }
const MAP = {
  "(Matelassage) في صناعة الألبسة الجاهزة الصناعية – Prêt-à-porter": { ar: "التبطين في صناعة الألبسة الجاهزة", fr: "Le matelassage en prêt-à-porter", en: "Quilting in Ready-to-Wear" },
  "CAO تصميم الباترون الرقمي (Conception Assistée par Ordinateur)": { ar: "تصميم الباترون الرقمي (CAO)", fr: "Patronnage numérique (CAO)", en: "Computer-Aided Pattern Design (CAD)" },
  "les finitions des cours de coutures présentiel تشطيبات دروس الدورات الحضورية": { ar: "التشطيبات والخياطة النهائية", fr: "Les finitions en couture", en: "Couture Finishing Techniques" },
  "اخذ المقاسات و دراسة طبيعة الاجسام": { ar: "أخذ المقاسات ودراسة طبيعة الأجسام", fr: "Prise de mesures & étude morphologique", en: "Measurements & Body Morphology" },
  "استخراج الباترون بالمولاج": { ar: "استخراج الباترون بالمولاج", fr: "Patronnage par moulage", en: "Pattern Making by Draping" },
  "استخراج الملابس التقليدية": { ar: "باترون الملابس التقليدية", fr: "Patronnage des vêtements traditionnels", en: "Traditional Garment Patterns" },
  "استخراج موديلات خاصة بالتصميم الراق العصري": { ar: "موديلات التصميم الراقي العصري", fr: "Modèles haute couture moderne", en: "Modern Haute Couture Designs" },
  "افرشة و اغطية": { ar: "المفارش والأغطية", fr: "Linge de maison", en: "Home Linens & Bedding" },
  "الأثواب التقليدية الرجالية": { ar: "الأثواب التقليدية الرجالية", fr: "Tenues traditionnelles masculines", en: "Men's Traditional Garments" },
  "الباترون ا لاساسي المجسم ببانسات الصدر": { ar: "الباترون الأساسي المجسّم ببنسات الصدر", fr: "Patron de base avec pinces poitrine", en: "Basic Bodice Block with Bust Darts" },
  "الباترون الخاص بالأقمصة الرجالية (Chemise Homme)": { ar: "باترون القميص الرجالي", fr: "Patron de chemise homme", en: "Men's Shirt Pattern" },
  "الباترون الرجالي": { ar: "الباترون الرجالي", fr: "Patronnage masculin", en: "Menswear Patternmaking" },
  "الباترون الصناعي": { ar: "الباترون الصناعي", fr: "Patronnage industriel", en: "Industrial Patternmaking" },
  "التدريج بالمقاسات": { ar: "تدريج المقاسات", fr: "Gradation des tailles", en: "Pattern Grading" },
  "التسويق الرقمي لمشاريع الخياطة": { ar: "التسويق الرقمي لمشاريع الخياطة", fr: "Marketing digital pour ateliers de couture", en: "Digital Marketing for Sewing Businesses" },
  "التسويق في مجال الأزياء": { ar: "التسويق في مجال الأزياء", fr: "Marketing de la mode", en: "Fashion Marketing" },
  "التشكيل بالمولاج": { ar: "التشكيل بالمولاج", fr: "Techniques de moulage", en: "Draping Techniques" },
  "التطريز الالكتروني": { ar: "التطريز الآلي", fr: "Broderie machine", en: "Machine Embroidery" },
  "الدرابي بالمولاج": { ar: "الدرابيه بالمولاج", fr: "Le drapé par moulage", en: "Draped Designs (Moulage)" },
  "القص الصناعي": { ar: "القص الصناعي", fr: "La coupe industrielle", en: "Industrial Cutting" },
  "المحور 10 : بانسات الصدر و القصات les pinces et les découpes": { ar: "المحور 10 — بنسات الصدر والقصّات", fr: "Module 10 — Pinces & découpes", en: "Module 10 — Darts & Seam Lines" },
  "المحور 11 : المعاطف والملابس الكلاسيكية ذات الياقات": { ar: "المحور 11 — المعاطف والياقات الكلاسيكية", fr: "Module 11 — Manteaux & cols classiques", en: "Module 11 — Coats & Classic Collars" },
  "المحور 12 : استخراج قطع الصواري": { ar: "المحور 12 — قطع السهرة", fr: "Module 12 — Pièces de soirée", en: "Module 12 — Evening Wear Patterns" },
  "المحور 2: اخذ المقاسات و دراسة طبيعة الاجسام": { ar: "المحور 2 — أخذ المقاسات ودراسة الأجسام", fr: "Module 2 — Prise de mesures & morphologie", en: "Module 2 — Measurements & Body Morphology" },
  "المحور 3 : الباترون الاساسي المسطح بدون بانسات": { ar: "المحور 3 — الباترون الأساسي المسطّح", fr: "Module 3 — Patron de base à plat", en: "Module 3 — Basic Flat Pattern" },
  "المحور 4 : ماكنات الخياطة": { ar: "المحور 4 — آلات الخياطة", fr: "Module 4 — Les machines à coudre", en: "Module 4 — Sewing Machines" },
  "المحور 5 : اساسيات الاكمام": { ar: "المحور 5 — أساسيات الأكمام", fr: "Module 5 — Les bases des manches", en: "Module 5 — Sleeve Fundamentals" },
  "المحور 6 : استخراج مودالات خاصة بالبيت": { ar: "المحور 6 — ملابس المنزل", fr: "Module 6 — Vêtements d'intérieur", en: "Module 6 — Loungewear & Homewear" },
  "المحور 7 : استخراج مودلات الحجابات": { ar: "المحور 7 — موديلات الحجاب", fr: "Module 7 — Modèles de hijab", en: "Module 7 — Hijab Patterns" },
  "المحور 8 : اساسيات البنطال (السروال)": { ar: "المحور 8 — أساسيات البنطلون", fr: "Module 8 — Les bases du pantalon", en: "Module 8 — Trouser Fundamentals" },
  "المحور 9 : اساسيات التنورة": { ar: "المحور 9 — أساسيات التنورة", fr: "Module 9 — Les bases de la jupe", en: "Module 9 — Skirt Fundamentals" },
  "المحور1 : اهم الدورات الواجب اتباعها و اهم الادوات المستعملة": { ar: "المحور 1 — مدخل إلى الخياطة والأدوات الأساسية", fr: "Module 1 — Introduction & outils essentiels", en: "Module 1 — Introduction & Essential Tools" },
  "المستوى الأول — الأساسيات و الملابس اليومية": { ar: "المستوى الأول — الأساسيات والملابس اليومية", fr: "Niveau 1 — Bases & vêtements du quotidien", en: "Level 1 — Fundamentals & Everyday Garments" },
  "المستوى الثالث — الصواري بتقنية المولاج": { ar: "المستوى الثالث — فساتين السهرة بالمولاج", fr: "Niveau 3 — Tenues de soirée par moulage", en: "Level 3 — Evening Wear by Draping" },
  "المستوى الثاني — الكلاسيك و الصواري": { ar: "المستوى الثاني — الكلاسيك وفساتين السهرة", fr: "Niveau 2 — Classique & tenues de soirée", en: "Level 2 — Classic & Evening Wear" },
  "الملف التقني (Dossier Technique)": { ar: "الملف التقني", fr: "Le dossier technique", en: "The Technical File (Tech Pack)" },
  "المولاج": { ar: "المولاج", fr: "Le moulage", en: "Draping" },
  "باترون الاطفال": { ar: "باترون ملابس الأطفال", fr: "Patronnage enfant", en: "Children's Patternmaking" },
  "باترون البدلة الرسمية (Costume Homme)": { ar: "باترون البدلة الرسمية الرجالية", fr: "Patron du costume homme", en: "Men's Suit Pattern" },
  "باترون السروال الرجالي": { ar: "باترون السروال الرجالي", fr: "Patron du pantalon homme", en: "Men's Trouser Pattern" },
  "بناء العلامة التجارية": { ar: "بناء العلامة التجارية", fr: "Création de marque", en: "Brand Building" },
  "تاريخ الأزياء": { ar: "تاريخ الأزياء", fr: "Histoire de la mode", en: "Fashion History" },
  "تحويلات البانسات": { ar: "تحويلات البنسات", fr: "Transformation des pinces", en: "Dart Manipulation" },
  "تشطيبات و تقنيات جمع القطع المفصلة للملابس الرجالية": { ar: "تجميع وتشطيب الملابس الرجالية", fr: "Assemblage & finitions du vêtement masculin", en: "Menswear Assembly & Finishing" },
  "دراسة القطع الكلاسيكية (كالبدلة الرسمية، الفستان البسيط، القميص، التنورة)": { ar: "دراسة القطع الكلاسيكية", fr: "Étude des pièces classiques", en: "Study of Classic Garments" },
  "دراسة تصاميم الصواري (الكورسيه / bustier / corset)": { ar: "فساتين السهرة والكورساج", fr: "Tenues de soirée & bustiers", en: "Evening Gowns & Corsetry" },
  "دورة الأكسسوارات": { ar: "دورة الإكسسوارات", fr: "Les accessoires de mode", en: "Fashion Accessories" },
  "دورة خياطة داخلية / ملابس النوم": { ar: "الملابس الداخلية وملابس النوم", fr: "Lingerie & vêtements de nuit", en: "Lingerie & Sleepwear" },
  "دورة في الباترون الصناعي": { ar: "دورة الباترون الصناعي", fr: "Patronnage industriel — cours complet", en: "Industrial Patternmaking — Full Course" },
  "دورة ملابس اطفال": { ar: "خياطة ملابس الأطفال", fr: "Couture pour enfants", en: "Children's Clothing" },
  "رسم الأزياء (Fashion Sketching / رسم الأزياء)": { ar: "رسم الأزياء", fr: "Dessin de mode", en: "Fashion Sketching" },
  "طرز يدوي": { ar: "الطرز اليدوي", fr: "Broderie à la main", en: "Hand Embroidery" },
  "فن تنسيق الأقمشة والخامات": { ar: "فن تنسيق الأقمشة والخامات", fr: "L'art d'associer tissus & matières", en: "The Art of Fabric & Material Pairing" },
  "مقدمة في الموضة والستايليزم": { ar: "مقدمة في الموضة والستايلينغ", fr: "Introduction à la mode & au stylisme", en: "Introduction to Fashion & Styling" },
  "نظرية الألوان في تصميم الأزياء": { ar: "نظرية الألوان في تصميم الأزياء", fr: "La théorie des couleurs en mode", en: "Color Theory in Fashion Design" },
};

// cours de test à SUPPRIMER (par titre_fr exact)
const DELETE_FR = ["test arazz centre", "test patronnage19", "cours essey  bunny apload", "robe essey"];

const EXEC = process.argv.includes("--execute");

(async () => {
  const { data: courses, error } = await sb.from("courses").select("id, titre_fr, titre_ar");
  if (error) { console.error(error.message); process.exit(1); }

  let updated = 0, missing = 0, deleted = 0;
  const noProposal = [];
  for (const c of courses) {
    if (DELETE_FR.includes((c.titre_fr || "").trim())) {
      console.log(`🗑️  SUPPRIMER « ${c.titre_fr} »`);
      if (EXEC) { const { error: de } = await sb.from("courses").delete().eq("id", c.id); if (!de) deleted++; else console.log("   ⚠️", de.message); }
      continue;
    }
    const m = MAP[c.titre_ar];
    if (!m) { noProposal.push(c.titre_ar || c.titre_fr); missing++; continue; }
    console.log(`✏️  ${c.titre_ar}\n     AR: ${m.ar}\n     FR: ${m.fr}\n     EN: ${m.en}`);
    if (EXEC) {
      const { error: ue } = await sb.from("courses").update({ titre_ar: m.ar, titre_fr: m.fr, titre_en: m.en }).eq("id", c.id);
      if (!ue) updated++; else console.log("   ⚠️", ue.message);
    }
  }
  console.log(`\n=== ${EXEC ? "APPLIQUÉ" : "DRY-RUN"} ===`);
  console.log("À renommer:", Object.keys(MAP).length, "| renommés:", updated, "| supprimés:", deleted, "| sans proposition:", missing);
  if (noProposal.length) { console.log("\n⚠️ Cours sans proposition (non touchés) :"); noProposal.forEach((t) => console.log("   -", t)); }
})().catch((e) => { console.error(e); process.exit(1); });
