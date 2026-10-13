/**
 * Applique les migrations du LMS sur le projet de RECETTE (jamais ailleurs).
 *
 *   RECETTE_CONFIRME=oui RECETTE_SUPABASE_URL=… RECETTE_DATABASE_URL=… \
 *     node scripts/recette/migrer.mjs [--seulement 095_student_care.sql]
 *
 * Applique supabase/migrations/NNN_*.sql dans l'ordre des noms (le vieux lot
 * `_APPLIQUER_MIGRATIONS.sql` est ignoré), chacune dans une transaction, et note
 * ce qui est fait dans `_recette_migrations` (table propre à la recette) pour
 * pouvoir relancer sans réappliquer. Au premier échec : arrêt, rien de plus.
 */

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import pg from "pg";
import { cibleRecette } from "./garde.mjs";

cibleRecette({ base: true });

const i = process.argv.indexOf("--seulement");
const seulement = i > 0 ? process.argv[i + 1] : null;
const dossier = join(process.cwd(), "supabase", "migrations");
const fichiers = readdirSync(dossier).filter((f) => /^\d{3}_.*\.sql$/.test(f)).sort()
  .filter((f) => !seulement || f === seulement);
if (!fichiers.length) { console.error("Aucune migration à appliquer."); process.exit(1); }

const client = new pg.Client({ connectionString: process.env.RECETTE_DATABASE_URL, ssl: { rejectUnauthorized: false } });
await client.connect();
try {
  await client.query("CREATE TABLE IF NOT EXISTS public._recette_migrations (nom text PRIMARY KEY, applique_le timestamptz NOT NULL DEFAULT now())");
  const { rows } = await client.query("SELECT nom FROM public._recette_migrations");
  const faites = new Set(rows.map((r) => r.nom));
  for (const f of fichiers) {
    if (faites.has(f)) { console.log(`· ${f} déjà appliquée`); continue; }
    const sql = readFileSync(join(dossier, f), "utf8");
    try {
      await client.query("BEGIN");
      await client.query(sql);
      await client.query("INSERT INTO public._recette_migrations (nom) VALUES ($1)", [f]);
      await client.query("COMMIT");
      console.log(`✔ ${f}`);
    } catch (e) {
      await client.query("ROLLBACK").catch(() => {});
      console.error(`✖ ${f} : ${e.message}`);
      process.exitCode = 1;
      break;
    }
  }
} finally {
  await client.end();
}
