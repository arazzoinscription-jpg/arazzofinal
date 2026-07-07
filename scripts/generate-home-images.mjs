/**
 * Génère les images de la page d'accueil via Gemini (« Nano Banana »), optimisées
 * JPEG (sharp) : 8 cartes de catégories (4:5) + 1 fond de section CTA (16:9).
 *
 *   node --env-file=.env.local scripts/generate-home-images.mjs
 *   options : --only=modelisme,cta   --force
 */

import fs from "fs";
import path from "path";
import sharp from "sharp";

const API_KEY = process.env.GEMINI_API_KEY;
const MODEL = process.env.GEMINI_IMAGE_MODEL ?? "gemini-3.1-flash-image";
const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";
if (!API_KEY) { console.error("❌ GEMINI_API_KEY manquant (node --env-file=.env.local ...)."); process.exit(1); }

const STYLE =
  "Editorial fashion photography, soft natural studio light, warm cream and beige tones with subtle violet and " +
  "terracotta accents, minimalist elegant high-end atelier mood, refined, tasteful, modest styling, sharp focus, " +
  "no text, no words, no logo, no watermark.";

// Cartes de catégories (formations) — dossier public/images/home-categories/<slug>.jpg (4:5).
const CATS = [
  { slug: "modelisme",            subject: "close-up of a patternmaker's hands drafting a sewing pattern on paper with a ruler and pencil on an atelier table" },
  { slug: "stylisme",             subject: "a fashion designer sketching a garment design in a sketchbook, fabric swatches and mood board softly behind" },
  { slug: "modelisme-industriel", subject: "a tidy garment workshop with an industrial sewing machine, neat rolls of fabric and thread cones" },
  { slug: "accessoire",           subject: "an elegant flat-lay of handmade fashion accessories: a leather handbag, a belt and a silk scarf" },
  { slug: "artisanat",            subject: "extreme close-up of traditional hand embroidery, golden thread and beads on fine fabric, artisan hands at work" },
  { slug: "patron-numerique",     subject: "a digital sewing pattern displayed on a tablet screen next to folded fabric, scissors and a measuring tape" },
  { slug: "pret-a-porter",        subject: "a boutique rack of finished ready-to-wear garments on wooden hangers in a bright atelier" },
  { slug: "haute-couture",        subject: "a luxurious haute couture gown detail with delicate embroidery and draping on a dress form mannequin" },
];

// Fond de la section CTA — public/images/home/cta.jpg (16:9 large).
const WIDE = [
  { out: "home/cta.jpg", w: 1600, h: 900, subject: "a warm inviting couture atelier: a woman sewing at a machine near a large window with soft daylight, fabric and dress forms around, wide cinematic composition" },
];

// Portraits / visuels ponctuels — clés = nom de fichier sans extension.
const MISC = [
  { key: "founder", out: "founder.jpg", w: 640, h: 640, subject: "a warm confident portrait of an elegant Algerian woman, fashion atelier founder in her early forties, gentle genuine smile, refined modest clothing, standing in a bright couture atelier with fabric bolts and a dress form softly blurred behind her, natural window light, waist-up" },
  { key: "community", out: "community.jpg", w: 560, h: 880, subject: "several happy women of different ages together in a bright sewing atelier, proudly showing handmade garments they created, warm friendly community moment, candid, vertical composition" },
];

const argv = process.argv.slice(2);
const only = (argv.find((a) => a.startsWith("--only=")) ?? "").replace("--only=", "").split(",").filter(Boolean);
const force = argv.includes("--force");

async function generate(subject) {
  const res = await fetch(`${ENDPOINT}/${MODEL}:generateContent?key=${API_KEY}`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents: [{ parts: [{ text: `${subject}. ${STYLE}` }] }], generationConfig: { responseModalities: ["TEXT", "IMAGE"] } }),
  });
  if (!res.ok) throw new Error(`Gemini ${res.status} — ${(await res.text().catch(() => "")).slice(0, 200)}`);
  const parts = (await res.json())?.candidates?.[0]?.content?.parts ?? [];
  for (const p of parts) { const d = p.inline_data?.data ?? p.inlineData?.data; if (d) return Buffer.from(d, "base64"); }
  throw new Error("Aucune image renvoyée");
}

async function make(out, subject, w, h) {
  const abs = path.join(process.cwd(), "public", "images", out);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  if (!force && fs.existsSync(abs)) { console.log(`⏭  ${out} (existe déjà)`); return; }
  process.stdout.write(`🎨 ${out} … `);
  const raw = await generate(subject);
  await sharp(raw).resize(w, h, { fit: "cover", position: "attention" }).jpeg({ quality: 82, mozjpeg: true }).toFile(abs);
  console.log(`✅ ${Math.round(fs.statSync(abs).size / 1024)} Ko`);
}

async function main() {
  for (const c of CATS) {
    if (only.length && !only.includes(c.slug)) continue;
    try { await make(`home-categories/${c.slug}.jpg`, c.subject, 800, 1000); } catch (e) { console.log(`❌ ${c.slug}: ${e.message}`); }
  }
  for (const wImg of WIDE) {
    if (only.length && !only.includes("cta")) continue;
    try { await make(wImg.out, wImg.subject, wImg.w, wImg.h); } catch (e) { console.log(`❌ ${wImg.out}: ${e.message}`); }
  }
  for (const m of MISC) {
    if (only.length && !only.includes(m.key)) continue;
    try { await make(m.out, m.subject, m.w, m.h); } catch (e) { console.log(`❌ ${m.out}: ${e.message}`); }
  }
  console.log("Terminé.");
}
main();
