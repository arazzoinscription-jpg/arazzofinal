/**
 * Génère les images de catégories de la boutique de patrons via Google Gemini
 * (modèle image « Nano Banana »), converties en JPEG 4:5 optimisé (sharp).
 *
 * Lancer avec la clé chargée :
 *   node --env-file=.env.local scripts/generate-category-images.mjs
 * Options :
 *   --only=robe,jupe   → ne génère que ces catégories
 *   --force            → régénère même si le fichier existe déjà
 */

import fs from "fs";
import path from "path";
import sharp from "sharp";

const API_KEY = process.env.GEMINI_API_KEY;
const MODEL = process.env.GEMINI_IMAGE_MODEL ?? "gemini-3.1-flash-image";
const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";

if (!API_KEY) {
  console.error("❌ GEMINI_API_KEY manquant. Lancer avec: node --env-file=.env.local scripts/generate-category-images.mjs");
  process.exit(1);
}

const OUT_DIR = path.join(process.cwd(), "public", "images", "categories");
fs.mkdirSync(OUT_DIR, { recursive: true });

// Style commun → cohérence visuelle entre toutes les vignettes (identité Arazzo).
const STYLE =
  "Editorial fashion photography, single subject, soft natural studio light, warm cream and beige backdrop " +
  "with subtle violet and terracotta accents, minimalist elegant high-end atelier mood, refined, tasteful, " +
  "modest styling, portrait vertical composition, sharp focus, no text, no words, no logo, no watermark.";

const CATEGORIES = [
  { slug: "robe",         subject: "an elegant modest woman's long flowing dress worn by a graceful model, soft draping fabric" },
  { slug: "jupe",         subject: "a stylish woman's midi skirt worn by a model, elegant pleats and movement" },
  { slug: "pantalon",     subject: "elegant tailored high-waisted women's trousers worn by a model, clean lines" },
  { slug: "haut",         subject: "a refined woman's blouse / top with delicate details worn by a model" },
  { slug: "veste",        subject: "a chic tailored women's blazer jacket worn by a model, structured shoulders" },
  { slug: "ensemble",     subject: "a coordinated elegant two-piece women's outfit set worn by a model" },
  { slug: "traditionnel", subject: "an elegant traditional Maghrebi caftan / takchita, richly embroidered, luxurious fabric, worn by a model" },
  { slug: "accessoire",   subject: "an elegant flat-lay of fashion accessories: a leather handbag, a silk scarf and a hat, arranged neatly" },
];

const argv = process.argv.slice(2);
const only = (argv.find((a) => a.startsWith("--only=")) ?? "").replace("--only=", "").split(",").filter(Boolean);
const force = argv.includes("--force");

async function generate(subject) {
  const res = await fetch(`${ENDPOINT}/${MODEL}:generateContent?key=${API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: `${subject}. ${STYLE}` }] }],
      generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
    }),
  });
  if (!res.ok) throw new Error(`Gemini ${res.status} — ${(await res.text().catch(() => "")).slice(0, 200)}`);
  const json = await res.json();
  const parts = json?.candidates?.[0]?.content?.parts ?? [];
  for (const p of parts) {
    const data = p.inline_data?.data ?? p.inlineData?.data;
    if (data) return Buffer.from(data, "base64");
  }
  throw new Error("Aucune image renvoyée");
}

async function main() {
  const list = CATEGORIES.filter((c) => only.length === 0 || only.includes(c.slug));
  for (const c of list) {
    const out = path.join(OUT_DIR, `${c.slug}.jpg`);
    if (!force && fs.existsSync(out)) { console.log(`⏭  ${c.slug} (existe déjà)`); continue; }
    try {
      process.stdout.write(`🎨 ${c.slug} … `);
      const raw = await generate(c.subject);
      await sharp(raw).resize(800, 1000, { fit: "cover", position: "attention" }).jpeg({ quality: 82, mozjpeg: true }).toFile(out);
      const kb = Math.round(fs.statSync(out).size / 1024);
      console.log(`✅ ${kb} Ko → ${path.relative(process.cwd(), out)}`);
    } catch (e) {
      console.log(`❌ ${e.message}`);
    }
  }
  console.log("Terminé.");
}

main();
