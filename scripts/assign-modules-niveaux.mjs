/**
 * Rattache les modules 1-9 à « Modélisme › Femme › Niveau 1 » et les modules
 * 10-12 à « Niveau 2 », et s'assure qu'ils sont publiés + visibles à l'inscription
 * (sinon ils n'apparaissent pas sur la page Formations).
 *
 * Idempotent : relancer ne crée pas de doublon (ON CONFLICT sur la clé primaire).
 * Usage : node scripts/assign-modules-niveaux.mjs
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

const { data: cats } = await s.from("categories").select("id, slug");
const n1 = cats.find((c) => c.slug === "modelisme-femme-niveau-1");
const n2 = cats.find((c) => c.slug === "modelisme-femme-niveau-2");
if (!n1 || !n2) { console.error("❌ Catégories niveau 1/2 introuvables."); process.exit(1); }

const { data: courses } = await s.from("courses").select("id, slug, titre_fr");
const byTid = new Map();
for (const c of courses) { const t = trailingId(c.slug); if (t) byTid.set(t, c); }

async function assign(ids, cat, label) {
  const links = [];
  const courseIds = [];
  for (const tid of ids) {
    const c = byTid.get(tid);
    if (!c) { console.warn(`  ⚠️  [${tid}] cours introuvable — ignoré`); continue; }
    links.push({ course_id: c.id, category_id: cat.id });
    courseIds.push(c.id);
  }
  if (links.length) {
    const { error: e1 } = await s.from("course_categories").upsert(links, { onConflict: "course_id,category_id", ignoreDuplicates: true });
    if (e1) console.error(`  ❌ liaison ${label}:`, e1.message);
    const { error: e2 } = await s.from("courses").update({ published: true, visible_inscription: true }).in("id", courseIds);
    if (e2) console.error(`  ❌ visibilité ${label}:`, e2.message);
  }
  console.log(`✅ ${label}: ${links.length} module(s) rattaché(s) + rendus visibles.`);
}

await assign(LVL1, n1, "NIVEAU 1");
await assign(LVL2, n2, "NIVEAU 2");
console.log("\nTerminé.");
