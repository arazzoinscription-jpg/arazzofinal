import { test } from "node:test";
import assert from "node:assert/strict";
import { occurrencesHebdo, occurrenceUnique, planSerie, SEMAINES_MAX, type OccurrenceExistante } from "./recurrence";

test("live unique : instant converti depuis l'heure d'Alger", () => {
  assert.deepEqual(occurrenceUnique("2026-10-20", "20:00"), { occurrence_date: "2026-10-20", starts_at: "2026-10-20T19:00:00.000Z" });
});

test("hebdomadaire : même jour, même heure d'Alger, chaque semaine, fin incluse", () => {
  const o = occurrencesHebdo({ dateDebut: "2026-10-20", dateFin: "2026-11-10", heure: "20:00" });
  assert.deepEqual(o.map((x) => x.occurrence_date), ["2026-10-20", "2026-10-27", "2026-11-03", "2026-11-10"]);
  assert.ok(o.every((x) => x.starts_at.endsWith("T19:00:00.000Z")));
});

test("hebdomadaire : passage d'année et bornes", () => {
  const o = occurrencesHebdo({ dateDebut: "2026-12-22", dateFin: "2027-01-05", heure: "09:00" });
  assert.deepEqual(o.map((x) => x.occurrence_date), ["2026-12-22", "2026-12-29", "2027-01-05"]);
  assert.throws(() => occurrencesHebdo({ dateDebut: "2026-10-20", dateFin: "2026-10-19", heure: "09:00" }));
  assert.throws(() => occurrencesHebdo({ dateDebut: "2026-10-20", dateFin: "2027-10-20", heure: "09:00" }), new RegExp(`${SEMAINES_MAX} semaines`));
});

const maintenant = new Date("2026-10-25T12:00:00Z");
const ex = (id: string, date: string, o: Partial<OccurrenceExistante> = {}): OccurrenceExistante => ({
  id, occurrence_date: date, starts_at: `${date}T19:00:00.000Z`, cancelled_at: null, occurrence_modifiee: false, ...o,
});

test("modifier une série : le passé ne bouge pas, une date n'est jamais créée deux fois", () => {
  const existantes = [ex("a", "2026-10-20"), ex("b", "2026-10-27"), ex("c", "2026-11-03")];
  const voulues = occurrencesHebdo({ dateDebut: "2026-10-20", dateFin: "2026-11-10", heure: "21:00" });
  const p = planSerie(existantes, voulues, maintenant);
  assert.deepEqual(p.passees, ["a"]);
  assert.deepEqual(p.aMettreAJour.map((x) => x.id), ["b", "c"]);
  assert.deepEqual(p.aCreer.map((x) => x.occurrence_date), ["2026-11-10"]);
  assert.deepEqual(p.aAnnuler, []);
});

test("raccourcir une série annule les occurrences futures en trop", () => {
  const existantes = [ex("b", "2026-10-27"), ex("c", "2026-11-03"), ex("d", "2026-11-10")];
  const voulues = occurrencesHebdo({ dateDebut: "2026-10-27", dateFin: "2026-11-03", heure: "20:00" });
  assert.deepEqual(planSerie(existantes, voulues, maintenant).aAnnuler, ["d"]);
});

test("annulation et modification manuelles sont respectées", () => {
  const existantes = [ex("b", "2026-10-27", { cancelled_at: "2026-10-24T10:00:00Z" }), ex("c", "2026-11-03", { occurrence_modifiee: true })];
  const voulues = occurrencesHebdo({ dateDebut: "2026-10-27", dateFin: "2026-11-03", heure: "20:00" });
  const p = planSerie(existantes, voulues, maintenant);
  assert.deepEqual(p.annuleesConservees, ["b"]);
  assert.deepEqual(p.modifieesConservees, ["c"]);
  assert.deepEqual(p.aCreer, []);
  assert.deepEqual(p.aMettreAJour, []);
});

test("une occurrence supprimée hors du module (ligne absente) n'est pas recréée par une modification de la série", () => {
  // Série du 27/10 au 10/11 ; l'occurrence du 03/11 a été supprimée (bouton 🗑 de la formatrice, SQL…).
  const anciennes = new Set(occurrencesHebdo({ dateDebut: "2026-10-27", dateFin: "2026-11-10", heure: "20:00" }).map((o) => o.occurrence_date));
  const existantes = [ex("b", "2026-10-27"), ex("d", "2026-11-10")];
  // Modification : nouvelle heure ET prolongation d'une semaine.
  const voulues = occurrencesHebdo({ dateDebut: "2026-10-27", dateFin: "2026-11-17", heure: "21:00" });
  const p = planSerie(existantes, voulues, maintenant, anciennes);
  assert.deepEqual(p.supprimeesRespectees, ["2026-11-03"]);
  assert.deepEqual(p.aCreer.map((x) => x.occurrence_date), ["2026-11-17"]); // seule la vraie nouvelle date
  assert.deepEqual(p.aMettreAJour.map((x) => x.id), ["b", "d"]);
});

test("sans règle précédente connue, comportement d'origine (création des dates manquantes)", () => {
  const existantes = [ex("b", "2026-10-27")];
  const voulues = occurrencesHebdo({ dateDebut: "2026-10-27", dateFin: "2026-11-03", heure: "20:00" });
  const p = planSerie(existantes, voulues, maintenant);
  assert.deepEqual(p.aCreer.map((x) => x.occurrence_date), ["2026-11-03"]);
  assert.deepEqual(p.supprimeesRespectees, []);
});
