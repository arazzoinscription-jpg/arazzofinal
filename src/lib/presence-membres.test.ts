import { test } from "node:test";
import assert from "node:assert/strict";
import { DUREE_ACTIVITE_MS, arrondirPct, chargeDiffusee, lireEtatMembre, lireMonActivite, membresDepuisPresence } from "./presence-membres";

const T = 1_800_000_000_000;
const A = "aaaaaaaa-0000-4000-8000-000000000001";

test("mon activité : valide, récente ; sinon aucune (la discrétion reste)", () => {
  assert.deepEqual(lireMonActivite(JSON.stringify({ code: "couture", le: T - 1000 }), T), { code: "couture", pct: null, discrete: false, le: T - 1000 });
  assert.deepEqual(lireMonActivite(JSON.stringify({ code: "modele", pct: 64, le: T }), T), { code: "modele", pct: 60, discrete: false, le: T });
  assert.equal(lireMonActivite(JSON.stringify({ code: "couture", le: T - DUREE_ACTIVITE_MS - 1 }), T).code, null);
  assert.equal(lireMonActivite(JSON.stringify({ code: "pirate", le: T }), T).code, null);
  assert.equal(lireMonActivite(JSON.stringify({ code: null, discrete: true, le: 0 }), T).discrete, true);
  assert.equal(lireMonActivite("{", T).code, null);
});

test("discrète : rien n'est diffusé", () => {
  assert.equal(chargeDiffusee({ code: "theorie", pct: null, discrete: true, le: T }), null);
  assert.deepEqual(chargeDiffusee({ code: "modele", pct: 30, discrete: false, le: T }), { activite: "modele", pct: 30 });
  assert.deepEqual(chargeDiffusee({ code: null, pct: null, discrete: false, le: T }), { activite: null, pct: null });
});

test("état reçu d'un autre appareil : filtré, pourcentage borné", () => {
  assert.deepEqual(lireEtatMembre({ activite: "modele", pct: 250 }), { activite: "modele", pct: 100 });
  assert.deepEqual(lireEtatMembre({ activite: "<script>", pct: 5 }), { activite: null, pct: null });
  assert.deepEqual(lireEtatMembre(null), { activite: null, pct: null });
  assert.equal(arrondirPct("abc"), null);
  assert.equal(arrondirPct(-4), 0);
});

test("presenceState → membres connectés (visiteurs anonymes ignorés)", () => {
  const m = membresDepuisPresence({ [A]: [{ activite: "patronage" }], "visiteur-123": [{ activite: "couture" }], [A.replace("1", "2")]: [] });
  assert.deepEqual([...m.keys()], [A]);
  assert.equal(m.get(A)?.activite, "patronage");
});
