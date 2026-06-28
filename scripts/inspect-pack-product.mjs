import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
function loadEnvLocal() {
  const p = resolve(process.cwd(), ".env.local");
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, "utf-8").split("\n")) {
    const t = line.trim(); if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("="); if (eq === -1) continue;
    const k = t.slice(0, eq).trim(); let v = t.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (k && process.env[k] === undefined) process.env[k] = v;
  }
}
loadEnvLocal();
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const SLUG = "formation-niveaux-1-niveaux-2-040627";
const { data: prod } = await s.from("products").select("id, title, type, slug, price, is_active, files, course_id").eq("slug", SLUG).maybeSingle();
console.log("PRODUIT:", prod);

let packId = null;
if (prod?.files) { const ref = (prod.files || []).find((f) => f.startsWith("pack:")); packId = ref ? ref.slice(5) : null; }
console.log("packId du produit:", packId);

if (packId) {
  const { data: pack } = await s.from("course_packs").select("id, titre_fr, slug, prix_dzd, published, subscription_enabled, duration_months").eq("id", packId).maybeSingle();
  console.log("PACK:", pack);
  const { data: items } = await s.from("course_pack_items").select("course:courses(id, titre_fr, slug, published, chapters(id))").eq("pack_id", packId);
  console.log("COURS DU PACK:", (items ?? []).map((i) => ({ titre: i.course?.titre_fr, slug: i.course?.slug, pub: i.course?.published, chapitres: (i.course?.chapters ?? []).length })));
}

console.log("\n=== Tous les course_packs (id, titre, sub, bundle?) ===");
const { data: packs } = await s.from("course_packs").select("id, titre_fr, subscription_enabled, duration_months, published");
const { data: bundles } = await s.from("products").select("slug, is_active, files").eq("type", "bundle");
for (const p of packs ?? []) {
  const b = (bundles ?? []).find((x) => (x.files || []).includes("pack:" + p.id));
  console.log(`- ${p.titre_fr} | sub=${p.subscription_enabled} mois=${p.duration_months} pub=${p.published} | bundleSlug=${b?.slug ?? "—"} active=${b?.is_active ?? "—"}`);
}
