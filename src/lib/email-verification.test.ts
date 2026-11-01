import { test } from "node:test";
import assert from "node:assert/strict";
import { analyserEmail, domaineCorrige, suggestion } from "./email-verification";

test("les fautes vues chez les élèves sont reconnues et corrigées", () => {
  assert.equal(suggestion("amina@glail.com"), "amina@gmail.com");
  assert.equal(suggestion("amina@gamil.com"), "amina@gmail.com");
  assert.equal(suggestion("amina@gmail.c"), "amina@gmail.com");
  assert.equal(suggestion("sara@hotmial.fr"), "sara@hotmail.fr");
  assert.equal(domaineCorrige("gmali.com"), "gmail.com");
  assert.equal(suggestion("amina@gmail.com"), null);
});

test("une adresse juste passe ; une école ou une entreprise inconnue n'est pas « corrigée »", () => {
  assert.deepEqual(analyserEmail("  Amina.B@Gmail.com "), { ok: true, email: "amina.b@gmail.com" });
  assert.equal(analyserEmail("prof@enst.dz").ok, true);
  assert.equal(analyserEmail("contact@arazzo.shop").ok, true);
});

test("forme invalide, jetable, faute : refusées avec un message clair", () => {
  const f = analyserEmail("amina@gmail.c");
  assert.equal(f.ok, false);
  if (!f.ok) assert.equal(f.suggestion, "amina@gmail.com");
  assert.equal(analyserEmail("pas-une-adresse").ok, false);
  const j = analyserEmail("x@yopmail.com");
  assert.equal(!j.ok && j.raison, "jetable");
  const t = analyserEmail("amina@gamil.com");
  assert.equal(!t.ok && t.raison, "faute");
});
