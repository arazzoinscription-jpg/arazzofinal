// Applique un fichier SQL via le pooler Supabase (IPv4).
// Usage : SUPA_PW="..." node scripts/apply-pooler.mjs <fichier.sql>
// La connexion directe db.<ref>.supabase.co étant IPv6, on passe par le pooler.
import fs from "fs";
import pg from "pg";

const REF = "gsqcyghmkgywrxitpiiv";
const PW = process.env.SUPA_PW;
const file = process.argv[2];
if (!PW) { console.error("❌ SUPA_PW manquant"); process.exit(1); }
if (!file || !fs.existsSync(file)) { console.error("❌ Fichier introuvable:", file); process.exit(1); }
const sql = fs.readFileSync(file, "utf8");

const regions = [
  "eu-west-1", "eu-central-1", "eu-west-3", "eu-west-2",
  "us-east-1", "us-east-2", "us-west-1", "ap-southeast-1", "ap-south-1",
];

for (const r of regions) {
  const host = `aws-0-${r}.pooler.supabase.com`;
  const client = new pg.Client({
    host, port: 5432, user: `postgres.${REF}`, password: PW,
    database: "postgres", ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 8000,
  });
  try {
    await client.connect();
    console.log("🔗 Connecté via", host);
    await client.query(sql);
    console.log("✅ Appliqué :", file);
    await client.end();
    process.exit(0);
  } catch (e) {
    const msg = e.message || String(e);
    if (/ENOTFOUND|ETIMEDOUT|EHOSTUNREACH|ECONNREFUSED|timeout/i.test(msg)) {
      try { await client.end(); } catch {}
      continue;
    }
    console.error(`❌ [${r}]`, msg);
    if (e.position) console.error("   contexte:", sql.slice(Math.max(0, e.position - 120), e.position + 60).replace(/\s+/g, " "));
    try { await client.end(); } catch {}
    process.exit(1);
  }
}
console.error("❌ Aucune région du pooler n'a répondu.");
process.exit(2);
