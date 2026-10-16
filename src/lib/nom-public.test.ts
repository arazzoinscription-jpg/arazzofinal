import { test } from "node:test";
import assert from "node:assert/strict";
import { initialesPubliques, nomPublic, pseudoAuto } from "./nom-public";

const A = "bbbbbbbb-0000-4000-8000-000000000001";
const B = "bbbbbbbb-0000-4000-8000-000000000002";

test("élève sans pseudo : initiales + numéro stable, jamais le nom complet", () => {
  const p = pseudoAuto(A, "Amina Benali");
  assert.match(p, /^AB-\d{3}$/);
  assert.equal(pseudoAuto(A, "Amina Benali"), p); // stable
  assert.notEqual(pseudoAuto(B, "Amina Benali"), p); // deux homonymes restent distinctes
  assert.equal(nomPublic({ id: A, nom: "Amina Benali", username: null, role: "eleve", roles: ["eleve"] }), p);
  assert.ok(!nomPublic({ id: A, nom: "Amina Benali", role: "eleve" }).includes("Amina"));
  assert.match(pseudoAuto(A, "Amina Ben Hadj Ali"), /^AA-\d{3}$/); // prénom + DERNIER nom
  assert.match(pseudoAuto(A, "Fella (fictive)"), /^F-\d{3}$/);
  assert.match(pseudoAuto(A, null), /^M-\d{3}$/);
  assert.match(pseudoAuto(A, "إيمان بن علي"), /^\p{L}{2}-\d{3}$/u);
});

test("pseudo choisi : il est utilisé tel quel", () => {
  assert.equal(nomPublic({ id: A, nom: "Amina Benali", username: " amina_couture ", role: "eleve" }), "amina_couture");
});

test("équipe : le nom reste public (signature des formatrices et de l'administration)", () => {
  assert.equal(nomPublic({ id: A, nom: "Fatima Prof", role: "formateur" }), "Fatima Prof");
  assert.equal(nomPublic({ id: A, nom: "Arazzo Admin", role: "eleve", roles: ["eleve", "admin"] }), "Arazzo Admin");
  assert.equal(nomPublic({ id: A, nom: "Créatrice Patrons", role: "patronniste" }), "Créatrice Patrons");
});

test("pastille d'avatar : initiales du pseudo automatique, sinon 1re lettre du pseudo", () => {
  assert.equal(initialesPubliques("AB-482"), "AB");
  assert.equal(initialesPubliques("amina_couture"), "A");
});
