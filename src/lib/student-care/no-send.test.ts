import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

/**
 * Garde-fou : le suivi pédagogique ne doit JAMAIS pouvoir envoyer un message
 * (e-mail, push, WhatsApp, notification) ni écrire ailleurs que dans sa table
 * de réglages. Ce test lit le code source du module et de la page.
 */

const RACINE = process.cwd();
const DOSSIERS = [join(RACINE, "src", "lib", "student-care"), join(RACINE, "src", "app", "admin", "suivi")];

function fichiers(dossier: string): string[] {
  return readdirSync(dossier).flatMap((nom) => {
    const chemin = join(dossier, nom);
    if (statSync(chemin).isDirectory()) return fichiers(chemin);
    return /\.(ts|tsx)$/.test(nom) && !/\.test\.ts$/.test(nom) ? [chemin] : [];
  });
}

const sources = DOSSIERS.flatMap(fichiers).map((f) => ({ f: relative(RACINE, f).replace(/\\/g, "/"), code: readFileSync(f, "utf8") }));

const INTERDITS: [RegExp, string][] = [
  [/from\s+["']@\/lib\/(email|email-templates|push|whatsapp|whatsapp-server|messaging|admin-notify|resend|learning-reminders|prospects|sur-mesure-notify|delivery-email|fiche-email|presentiel-email)["']/, "import d'un module d'envoi"],
  [/from\s+["'](resend|web-push)["']/, "import d'un client d'envoi"],
  [/\b(sendEmail|sendPushToUsers|pushToUserWithBadge|notifierVenteArazzo|runLearningReminders)\s*\(/, "appel d'une fonction d'envoi"],
  [/from\(["']notifications["']\)\s*\.\s*(insert|upsert|update|delete)/, "écriture de notification"],
  [/fetch\s*\(/, "appel réseau direct"],
];

test("le module couvre bien les fichiers attendus", () => {
  const noms = sources.map((s) => s.f);
  for (const attendu of ["src/lib/student-care/rules.ts", "src/lib/student-care/read.ts", "src/lib/student-care/load.ts", "src/app/admin/suivi/page.tsx", "src/app/admin/suivi/actions.ts"]) {
    assert.ok(noms.includes(attendu), `fichier non scanné : ${attendu}`);
  }
});

test("aucun mécanisme d'envoi n'est importé ni appelé", () => {
  for (const { f, code } of sources) {
    for (const [motif, raison] of INTERDITS) {
      assert.ok(!motif.test(code), `${f} : ${raison} (${motif})`);
    }
  }
});

test("la seule écriture est l'upsert des réglages, dans actions.ts", () => {
  const ecritures = sources.flatMap(({ f, code }) =>
    [...code.matchAll(/\.(insert|update|upsert|delete)\s*\(/g)].map((m) => `${f}:${m[1]}`));
  assert.deepEqual(ecritures, ["src/app/admin/suivi/actions.ts:upsert"]);
  const actions = sources.find((s) => s.f === "src/app/admin/suivi/actions.ts")!.code;
  assert.match(actions, /\.from\(TABLE_REGLAGES\)\.upsert\(/);
});

test("côté comptes (Auth), seule la LECTURE de la liste est utilisée", () => {
  const load = sources.find((s) => s.f === "src/lib/student-care/read.ts")!.code;
  const appelsAuth = [...load.matchAll(/auth\.admin\.(\w+)\(/g)].map((m) => m[1]);
  assert.deepEqual([...new Set(appelsAuth)], ["listUsers"]);
});
