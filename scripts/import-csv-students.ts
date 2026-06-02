/**
 * Script de migration CSV élèves WordPress → Supabase
 *
 * Usage:
 *   npm run migrate:csv -- --file=eleves.csv
 *
 * Format CSV attendu:
 *   nom,email,ville,pays,date_inscription
 *   "Amina Benali","amina@gmail.com","Alger","DZ","2023-01-15"
 */

import fs from "fs";
import path from "path";
import Papa from "papaparse";
import { createClient } from "@supabase/supabase-js";
import { sendMagicLinkEmail } from "../src/lib/resend";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface CsvRow {
  nom: string;
  email: string;
  ville?: string;
  pays?: string;
}

async function importStudents() {
  const args = process.argv.slice(2);
  const fileArg = args.find((a) => a.startsWith("--file="));
  const filePath = fileArg ? fileArg.split("=")[1] : "eleves.csv";

  if (!fs.existsSync(filePath)) {
    console.error(`❌ Fichier introuvable: ${filePath}`);
    process.exit(1);
  }

  const csv = fs.readFileSync(filePath, "utf-8");
  const { data: rows, errors } = Papa.parse<CsvRow>(csv, {
    header: true,
    skipEmptyLines: true,
  });

  if (errors.length) {
    console.error("Erreurs CSV:", errors);
  }

  console.log(`📂 ${rows.length} élèves trouvés`);

  let created = 0;
  let skipped = 0;
  let failed = 0;

  for (const row of rows) {
    if (!row.email) { skipped++; continue; }

    try {
      // Create auth user with random password (they'll use magic link)
      const { data, error } = await supabase.auth.admin.createUser({
        email: row.email,
        email_confirm: true,
        user_metadata: { nom: row.nom, ville: row.ville, pays: row.pays },
      });

      if (error?.message?.includes("already been registered")) {
        skipped++;
        continue;
      }

      if (error || !data.user) {
        console.error(`❌ ${row.email}: ${error?.message}`);
        failed++;
        continue;
      }

      // Insert into public.users
      await supabase.from("users").upsert({
        id: data.user.id,
        nom: row.nom,
        email: row.email,
        ville: row.ville ?? null,
        pays: row.pays ?? "DZ",
        role: "eleve",
      });

      // Send magic link
      const { data: linkData } = await supabase.auth.admin.generateLink({
        type: "magiclink",
        email: row.email,
      });

      if (linkData?.properties?.action_link) {
        await sendMagicLinkEmail(
          row.email,
          row.nom,
          linkData.properties.action_link
        );
      }

      created++;
      console.log(`✅ ${row.email} — importé`);

    } catch (err) {
      console.error(`💥 ${row.email}:`, err);
      failed++;
    }
  }

  console.log(`\n📊 Résumé:`);
  console.log(`  ✅ Créés : ${created}`);
  console.log(`  ⏭️  Ignorés : ${skipped}`);
  console.log(`  ❌ Échecs : ${failed}`);
}

importStudents();
