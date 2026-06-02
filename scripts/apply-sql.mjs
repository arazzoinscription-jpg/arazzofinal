/**
 * Applique un fichier .sql sur la base Supabase via connexion Postgres directe.
 * Le mot de passe est lu depuis la variable d'environnement DATABASE_URL
 * (jamais écrit en dur ici).
 *
 * Usage : DATABASE_URL="postgresql://..." node scripts/apply-sql.mjs <fichier.sql>
 */
import fs from "fs";
import pg from "pg";

const url = process.env.DATABASE_URL;
const file = process.argv[2];

if (!url) { console.error("❌ DATABASE_URL manquant"); process.exit(1); }
if (!file || !fs.existsSync(file)) { console.error("❌ Fichier SQL introuvable:", file); process.exit(1); }

const sql = fs.readFileSync(file, "utf8");

const client = new pg.Client({
  connectionString: url,
  ssl: { rejectUnauthorized: false },
});

try {
  await client.connect();
  console.log("🔗 Connecté à la base");
  await client.query(sql);
  console.log("✅ Migration appliquée avec succès :", file);
} catch (e) {
  console.error("❌ Erreur SQL:", e.message);
  if (e.position) {
    const around = sql.slice(Math.max(0, e.position - 120), e.position + 60);
    console.error("   …contexte:", around.replace(/\s+/g, " "));
  }
  process.exit(1);
} finally {
  await client.end();
}
