import { test } from "node:test";
import assert from "node:assert/strict";
import { instantAlger, heureAlger, jourSemaine, ajouterJours, ecartJours, semainesDuMois, moisVoisin, estHeureValide } from "./temps";

test("19:00 à Alger = 18:00 UTC (pas 19:00 comme le formulaire formatrice existant)", () => {
  assert.equal(instantAlger("2026-10-20", "19:00"), "2026-10-20T18:00:00.000Z");
  assert.equal(instantAlger("2026-01-05", "09:30"), "2026-01-05T08:30:00.000Z"); // hiver : pas d'heure d'été en Algérie
  assert.equal(instantAlger("2026-07-05", "09:30"), "2026-07-05T08:30:00.000Z"); // été : idem
});

test("00:30 à Alger tombe la veille en UTC", () => {
  assert.equal(instantAlger("2026-10-21", "00:30"), "2026-10-20T23:30:00.000Z");
  assert.equal(heureAlger("2026-10-20T23:30:00.000Z"), "00:30");
});

test("heure invalide refusée", () => {
  assert.equal(estHeureValide("24:00"), false);
  assert.equal(estHeureValide("7:00"), false);
  assert.throws(() => instantAlger("2026-10-20", "25:00"));
  assert.throws(() => instantAlger("2026-02-30", "10:00"));
});

test("jours de la semaine et calcul de dates", () => {
  assert.equal(jourSemaine("2026-10-19"), 1); // lundi
  assert.equal(jourSemaine("2026-10-25"), 7); // dimanche
  assert.equal(ajouterJours("2026-12-29", 7), "2027-01-05");
  assert.equal(ecartJours("2026-10-01", "2026-10-29"), 28);
});

test("calendrier : semaines du lundi au dimanche", () => {
  const s = semainesDuMois("2026-10"); // le 1er octobre 2026 est un jeudi
  assert.equal(s[0][0], "2026-09-28");
  assert.equal(s.at(-1)!.at(-1), "2026-11-01");
  assert.ok(s.every((w) => w.length === 7));
  assert.equal(moisVoisin("2026-12", 1), "2027-01");
  assert.equal(moisVoisin("2026-01", -1), "2025-12");
});
