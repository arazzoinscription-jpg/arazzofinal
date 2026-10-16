import { test } from "node:test";
import assert from "node:assert/strict";
import { bornesDe, jourAlger, lirePeriode, periodeActive, raccourcis } from "./groupes-periode";

test("période : dates invalides ignorées, dates inversées remises dans l'ordre", () => {
  assert.deepEqual(lirePeriode({ du: "2026-10-01", au: "2026-10-31" }), { du: "2026-10-01", au: "2026-10-31" });
  assert.deepEqual(lirePeriode({ du: "2026-10-31", au: "2026-10-01" }), { du: "2026-10-01", au: "2026-10-31" });
  assert.deepEqual(lirePeriode({ du: "2026-02-30", au: "pas une date" }), { du: null, au: null });
  assert.deepEqual(lirePeriode({ du: "2026-10-01'; drop table users;--" }), { du: null, au: null });
  assert.deepEqual(lirePeriode(null), { du: null, au: null });
  assert.equal(periodeActive({ du: null, au: null }), false);
  assert.equal(periodeActive({ du: "2026-10-01", au: null }), true);
});

test("bornes : jours d'Alger inclus (UTC+1), le dernier jour compte en entier", () => {
  assert.deepEqual(bornesDe({ du: "2026-10-01", au: "2026-10-31" }), {
    depuis: "2026-09-30T23:00:00.000Z", // 1er octobre 00 h à Alger
    avant: "2026-10-31T23:00:00.000Z",  // 1er novembre 00 h à Alger (exclu)
  });
  assert.deepEqual(bornesDe({ du: null, au: "2026-12-31" }), { depuis: null, avant: "2026-12-31T23:00:00.000Z" });
});

test("raccourcis : 7 jours, 30 jours, mois en cours (jours d'Alger)", () => {
  const m = new Date("2026-10-15T23:30:00Z"); // déjà le 16 à Alger
  assert.equal(jourAlger(m), "2026-10-16");
  const r = raccourcis(m);
  assert.deepEqual(r.map((x) => x.periode), [
    { du: "2026-10-10", au: "2026-10-16" },
    { du: "2026-09-17", au: "2026-10-16" },
    { du: "2026-10-01", au: "2026-10-16" },
  ]);
});
