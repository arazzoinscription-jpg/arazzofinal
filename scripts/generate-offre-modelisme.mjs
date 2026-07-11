/**
 * Génère les 3 photos des cartes « Modélisme » (offre) via Gemini (« Nano Banana »),
 * optimisées JPEG (sharp) au format carte 4:5.
 *
 *   node --env-file=.env.local scripts/generate-offre-modelisme.mjs
 *   options : --only=femme,homme,enfants   --force
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

const CARDS = [
  {
    key: "femme",
    out: "offre-modelisme-femme.jpg",
    subject:
      "a single elegant flowing women's evening dress on a dress form mannequin in the center of a bright couture atelier, graceful draping and a fitted bodice, the mannequin clearly in focus and filling the frame, a paper dress pattern on the table nearby, refined feminine haute-couture garment",
  },
  {
    key: "homme",
    out: "offre-modelisme-homme.jpg",
    subject:
      "a well-structured men's blazer on a tailoring bust, patternmaking rulers and a men's shirt pattern on paper on the table, masculine tailoring atelier, neat and precise",
  },
  {
    key: "enfants",
    out: "offre-modelisme-enfants.jpg",
    subject:
      "a cute small child's handmade dress and tiny garments on little wooden hangers in a bright atelier, a paper pattern for children's clothing on the table, tender playful yet elegant mood",
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

async function make(out, subject) {
  const abs = path.join(process.cwd(), "public", "images", out);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  if (!force && fs.existsSync(abs)) { console.log(`⏭  ${out} (existe déjà)`); return; }
  process.stdout.write(`🎨 ${out} … `);
  const raw = await generate(subject);
  await sharp(raw).resize(800, 1000, { fit: "cover", position: "attention" }).jpeg({ quality: 82, mozjpeg: true }).toFile(abs);
  console.log(`✅ ${Math.round(fs.statSync(abs).size / 1024)} Ko`);
}

async function main() {
  for (const c of CARDS) {
    if (only.length && !only.includes(c.key)) continue;
    try { await make(c.out, c.subject); } catch (e) { console.log(`❌ ${c.out}: ${e.message}`); }
  }
  console.log("Terminé.");
}
main();
