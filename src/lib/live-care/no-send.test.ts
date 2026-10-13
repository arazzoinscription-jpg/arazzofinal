import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

/**
 * Garde-fou : le module des lives ne doit JAMAIS pouvoir envoyer un message
 * (e-mail, push, WhatsApp, notification) et n'écrit que dans ses propres tables
 * (+ le verrou anti-doublon du cron existant). Ce test lit le code source.
 */

const RACINE = process.cwd();
const DOSSIERS = [join(RACINE, "src", "lib", "live-care"), join(RACINE, "src", "app", "admin", "lives")];

function fichiers(dossier: string): string[] {
  return readdirSync(dossier).flatMap((nom) => {
    const chemin = join(dossier, nom);
    if (statSync(chemin).isDirectory()) return fichiers(chemin);
    return /\.(ts|tsx)$/.test(nom) && !/\.test\.ts$/.test(nom) ? [chemin] : [];
  });
}

const sources = DOSSIERS.flatMap(fichiers).map((f) => ({ f: relative(RACINE, f).replace(/\\/g, "/"), code: readFileSync(f, "utf8") }));

const INTERDITS: [RegExp, string][] = [
  [/from\s+["']@\/lib\/(email|email-templates|push|whatsapp|whatsapp-server|messaging|admin-notify|resend|learning-reminders|prospects)["']/, "import d'un module d'envoi"],
  [/from\s+["'](resend|web-push)["']/, "import d'un client d'envoi"],
  [/\b(sendEmail|sendPushToUsers|pushToUserWithBadge|startLive)\s*\(/, "appel d'une fonction d'envoi"],
  [/from\(["']notifications["']\)\s*\.\s*(insert|upsert|update|delete)/, "écriture de notification"],
  [/fetch\s*\(/, "appel réseau direct"],
];

test("le garde-fou couvre bien le module et ses écrans", () => {
  const noms = sources.map((s) => s.f);
  for (const attendu of ["src/lib/live-care/donnees.ts", "src/lib/live-care/rappels.ts", "src/app/admin/lives/actions.ts", "src/app/admin/lives/page.tsx"]) {
    assert.ok(noms.includes(attendu), `fichier non scanné : ${attendu}`);
  }
});

test("aucun mécanisme d'envoi n'est importé ni appelé", () => {
  for (const { f, code } of sources) {
    for (const [motif, raison] of INTERDITS) assert.ok(!motif.test(code), `${f} : ${raison}`);
  }
});

test("écritures : seulement donnees.ts, et seulement sur les tables du module + le verrou du cron", () => {
  const permises = new Set(["T.series", "T.lives", "T.liens", "T.rappels", "T.verrous"]);
  for (const { f, code } of sources) {
    const ecritures = [...code.matchAll(/\.from\(([^)]+)\)\s*\.(insert|update|upsert|delete)\s*\(/g)];
    const nues = [...code.matchAll(/\.(insert|upsert|delete)\s*\(/g)].length;
    if (f !== "src/lib/live-care/donnees.ts") {
      assert.equal(nues + ecritures.length, 0, `${f} ne doit rien écrire`);
      continue;
    }
    assert.ok(ecritures.length > 0);
    for (const m of ecritures) assert.ok(permises.has(m[1].trim()), `${f} : écriture interdite sur ${m[1]}`);
  }
  const T = sources.find((s) => s.f === "src/lib/live-care/donnees.ts")!.code.match(/export const T = \{([\s\S]*?)\}/)![1];
  assert.match(T, /verrous:\s*"session_reminders"/);
  assert.doesNotMatch(T, /notifications|email_log|push_subscriptions/);
});

test("aucun statut « envoyé » n'est jamais écrit par le module", () => {
  for (const { f, code } of sources) assert.doesNotMatch(code, /statut:\s*"envoye"/, `${f} écrit un statut « envoye »`);
});
