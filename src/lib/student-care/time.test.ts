import { test } from "node:test";
import assert from "node:assert/strict";
import { estJourValide, jourAlger, joursDepuis, minuitAlgerIso, aujourdhuiAlger } from "./time";

test("le jour se lit à l'heure d'Alger (UTC+1), pas en UTC", () => {
  // 23 h 30 UTC le 1er octobre = 00 h 30 le 2 octobre à Alger.
  assert.equal(jourAlger("2026-10-01T23:30:00Z"), "2026-10-02");
  assert.equal(jourAlger("2026-10-01T22:59:00Z"), "2026-10-01");
});

test("minuit à Alger = 23 h 00 UTC la veille", () => {
  assert.equal(minuitAlgerIso("2026-10-01"), "2026-09-30T23:00:00.000Z");
  assert.equal(minuitAlgerIso("2026-01-15"), "2026-01-14T23:00:00.000Z"); // pas d'heure d'été en Algérie
});

test("les jours écoulés changent à minuit heure d'Alger", () => {
  const maintenant = new Date("2026-10-01T23:01:00Z"); // 00 h 01 le 2 oct. à Alger
  assert.equal(joursDepuis("2026-10-01T22:59:00Z", maintenant), 1); // 23 h 59 le 1er oct. à Alger : hier
  assert.equal(joursDepuis("2026-10-01T23:00:30Z", maintenant), 0);
  assert.equal(aujourdhuiAlger(maintenant), "2026-10-02");
});

test("une date absente n'est jamais « 0 jour »", () => {
  assert.equal(joursDepuis(null, new Date()), null);
  assert.equal(joursDepuis(undefined, new Date()), null);
  assert.equal(joursDepuis("pas une date", new Date()), null);
});

test("validation des dates AAAA-MM-JJ", () => {
  assert.equal(estJourValide("2026-10-01"), true);
  assert.equal(estJourValide("2026-02-31"), false);
  assert.equal(estJourValide("01/10/2026"), false);
  assert.equal(estJourValide(undefined), false);
  assert.throws(() => minuitAlgerIso("2026-13-01"));
});
