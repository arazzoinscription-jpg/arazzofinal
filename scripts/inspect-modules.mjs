/**
 * Inspection (lecture seule) de l'état des modules modélisme femme et de leur
 * rattachement aux catégories niveau 1 / niveau 2. Utilise la clé service role
 * de .env.local (projet courant). Ne modifie RIEN.
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

function loadEnvLocal() {
  const p = resolve(process.cwd(), ".env.local");
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, "utf-8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq === -1) continue;
    const k = t.slice(0, eq).trim();
    let v = t.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (k && process.env[k] === undefined) process.env[k] = v;
  }
}
loadEnvLocal();

const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const LVL1 = [6630, 3185, 3145, 6618, 3177, 3167, 3173, 3179, 3175];
const LVL2 = [6547, 5179, 5190];
const trailingId = (slug) => { const m = String(slug || "").match(/-(\d+)$/); return m ? parseInt(m[1]) : null; };

const { data: cats } = await s.from("categories").select("id, slug, name_fr, parent_id");
const n1 = cats.find((c) => c.slug === "modelisme-femme-niveau-1");
const n2 = cats.find((c) => c.slug === "modelisme-femme-niveau-2");
console.log("Catégorie niveau 1:", n1 ? `${n1.id} (${n1.name_fr})` : "❌ INTROUVABLE");
console.log("Catégorie niveau 2:", n2 ? `${n2.id} (${n2.name_fr})` : "❌ INTROUVABLE");

const { data: courses } = await s.from("courses").select("id, slug, titre_fr, published, visible_inscription");
const byTid = new Map();
for (const c of courses) { const t = trailingId(c.slug); if (t) byTid.set(t, c); }

const { data: cc } = await s.from("course_categories").select("course_id, category_id");
const catsOfCourse = new Map();
for (const r of cc) { if (!catsOfCourse.has(r.course_id)) catsOfCourse.set(r.course_id, new Set()); catsOfCourse.get(r.course_id).add(r.category_id); }

function report(label, ids, targetCat) {
  console.log(`\n=== ${label} (cible: ${targetCat?.slug ?? "?"}) ===`);
  for (const tid of ids) {
    const c = byTid.get(tid);
    if (!c) { console.log(`  [${tid}] ❌ cours introuvable`); continue; }
    const inCat = targetCat && catsOfCourse.get(c.id)?.has(targetCat.id);
    console.log(`  [${tid}] ${c.titre_fr?.slice(0, 40).padEnd(40)} | pub=${c.published} vis=${c.visible_inscription} | dansCatégorie=${inCat ? "OUI" : "non"}`);
  }
}
report("NIVEAU 1 modules 1-9", LVL1, n1);
report("NIVEAU 2 modules 10-12", LVL2, n2);
console.log(`\nTotal cours en base: ${courses.length}`);
