// Crée une fiche patron par photo (/public/images/patrons/N.png).
// Fiches NEUTRES et éditables : titre placeholder, prix 0, photo en preview + fichier.
// Usage : SUPA_PW="..." node scripts/seed-patrons-photos.mjs
import pg from "pg";

const REF = "gsqcyghmkgywrxitpiiv";
const PW = process.env.SUPA_PW;
if (!PW) { console.error("❌ SUPA_PW manquant"); process.exit(1); }

const c = new pg.Client({
  host: "aws-0-eu-west-1.pooler.supabase.com", port: 6543,
  user: `postgres.${REF}`, password: PW, database: "postgres",
  ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 10000,
});

await c.connect();
console.log("🔗 connecté 6543");

const { rows } = await c.query("select count(*)::int c from public.patrons");
if (rows[0].c > 0) {
  console.log(`ℹ️ ${rows[0].c} patron(s) déjà présents — on n'ajoute rien pour ne pas dupliquer.`);
  await c.end(); process.exit(0);
}

let n = 0;
for (let i = 1; i <= 26; i++) {
  const num = String(i).padStart(2, "0");
  const url = `/images/patrons/${i}.png`;
  await c.query(
    `INSERT INTO public.patrons (titre, prix_dzd, prix_eur, fichier_url, preview_url)
     VALUES ($1, 0, 0, $2, $2)`,
    [`Patron ${num}`, url],
  );
  n++;
}
console.log(`✅ ${n} fiches patrons créées (titre placeholder, prix 0, photo en aperçu + fichier).`);
await c.end();
process.exit(0);
