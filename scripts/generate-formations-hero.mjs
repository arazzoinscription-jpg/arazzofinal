/**
 * Génère les 2 photos du héro de la page Formations via Gemini (« Nano Banana »),
 * optimisées JPEG (sharp).
 *
 *   node --env-file=.env.local scripts/generate-formations-hero.mjs
 *   options : --only=1,2   --force
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

// Deux planches du héro. #1 = photo principale (portrait 4:5), #2 = vignette (carré).
const HERO = [
  {
    key: "1",
    out: "formations-hero-1.jpg",
    w: 900, h: 1125, // 4:5
    subject:
      "a young elegant Algerian couturière in a bright couture atelier, drafting a sewing pattern on paper on the cutting table with a wooden ruler, pencil and yellow measuring tape, rolls of fabric and a dress form softly blurred behind, focused serene mood, vertical waist-up composition",
  },
  {
    key: "2",
    out: "formations-hero-2.jpg",
    w: 800, h: 800, // carré
    subject:
      "close-up of a woman's hands guiding fine fabric under the needle of a sewing machine in a warm atelier, spools of thread and folded cloth nearby, shallow depth of field, candid craftsmanship detail",
  },
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
  for (const h of HERO) {
    if (only.length && !only.includes(h.key)) continue;
    try { await make(h.out, h.subject, h.w, h.h); } catch (e) { console.log(`❌ ${h.out}: ${e.message}`); }
  }
  console.log("Terminé.");
}
main();
