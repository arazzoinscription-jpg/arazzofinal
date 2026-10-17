import { test } from "node:test";
import assert from "node:assert/strict";
import { espaceAccueil } from "./espace-accueil";

test("formatrice et patronniste : leur espace s'ouvre en premier (pas l'espace élève)", () => {
  assert.equal(espaceAccueil(["formateur", "eleve"], "connexion"), "/formateur");
  assert.equal(espaceAccueil(["formateur"], "lien"), "/formateur");
  assert.equal(espaceAccueil(["patronniste", "eleve"], "lien"), "/patronniste");
});

test("élève et administration : comme avant", () => {
  assert.equal(espaceAccueil(["eleve"], "connexion"), "/communaute");
  assert.equal(espaceAccueil(["eleve"], "lien"), "/dashboard");
  assert.equal(espaceAccueil(["admin", "formateur"], "connexion"), "/communaute");
  assert.equal(espaceAccueil(["admin"], "lien"), "/dashboard");
});
