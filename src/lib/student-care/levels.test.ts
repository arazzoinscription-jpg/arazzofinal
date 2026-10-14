import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { NIVEAUX } from "../niveaux";
import { NIVEAU_PAR_COURS, IDS_TUTOR_ANCIENS_MODULES, classerCours } from "./levels";

const cours = (o: Partial<{ course_id: string; course_slug: string | null; course_titre_fr: string | null; course_titre_ar: string | null }>) => ({
  course_id: "00000000-0000-0000-0000-000000000000", course_slug: null, course_titre_fr: null, course_titre_ar: null, ...o,
});

test("les trois niveaux viennent exactement de src/lib/niveaux.ts", () => {
  assert.equal(NIVEAU_PAR_COURS.size, 3);
  assert.equal(NIVEAU_PAR_COURS.get(NIVEAUX["niveau-1"]), "N1");
  assert.equal(NIVEAU_PAR_COURS.get(NIVEAUX["niveau-2"]), "N2");
  assert.equal(NIVEAU_PAR_COURS.get(NIVEAUX["niveau-3"]), "N3");
});

/**
 * `scripts/build-levels.mjs` est exclu de git (.gitignore) : il n'existe que sur
 * le poste qui a construit les niveaux. On le cherche en remontant les dossiers
 * (un worktree vit sous le dossier principal) ; absent, le test est IGNORÉ en le
 * disant, plutôt que de passer à tort.
 */
function trouverBuildLevels(): string | null {
  let dossier = process.cwd();
  for (let i = 0; i < 6; i += 1) {
    const chemin = join(dossier, "scripts", "build-levels.mjs");
    if (existsSync(chemin)) return chemin;
    const parent = dirname(dossier);
    if (parent === dossier) break;
    dossier = parent;
  }
  return null;
}
const BUILD_LEVELS = trouverBuildLevels();

test("les anciens modules reconnus = les membres de scripts/build-levels.mjs (copie conforme)", {
  skip: BUILD_LEVELS ? false : "scripts/build-levels.mjs introuvable (fichier hors git) : cohérence non vérifiable ici",
}, () => {
  const script = readFileSync(BUILD_LEVELS as string, "utf8");
  const ids = [...script.matchAll(/members:\s*\[([^\]]*)\]/g)]
    .flatMap((m) => m[1].split(",").map((x) => Number(x.trim())).filter(Number.isFinite));
  assert.equal(ids.length, 21);
  assert.deepEqual([...new Set(ids)].sort((a, b) => a - b), [...IDS_TUTOR_ANCIENS_MODULES].sort((a, b) => a - b));
});

test("un cours de niveau reçoit son niveau ; rien d'autre n'en reçoit", () => {
  assert.deepEqual(classerCours(cours({ course_id: NIVEAUX["niveau-2"] })), { genre: "niveau", niveau: "N2" });
  assert.deepEqual(classerCours(cours({ course_titre_ar: "المحور 3 — الأكمام" })), { genre: "ancien_module", niveau: null });
  assert.deepEqual(classerCours(cours({ course_titre_fr: "المحور 11" })), { genre: "ancien_module", niveau: null });
  assert.deepEqual(classerCours(cours({ course_slug: "corset-3305" })), { genre: "ancien_module", niveau: null });
  assert.deepEqual(classerCours(cours({ course_slug: "patron-numerique-niveau-1" })), { genre: "autre", niveau: null });
  assert.deepEqual(classerCours(cours({ course_slug: "autre-cours-9999" })), { genre: "autre", niveau: null });
});
