import { test } from "node:test";
import assert from "node:assert/strict";
import { alertesActives, legendeResultat, texteAlerte, type ResultatVue } from "./resultats";

const M = new Date("2026-10-16T12:00:00Z");
const r = (id: string, createdAt: string): ResultatVue => ({ id, auteurId: "u", auteur: "KL-887", avatar: null, kind: "image", mediaUrl: "u", videoHls: null, thumbnail: null, legende: null, createdAt });

test("alerte : 24 h, plus récent d'abord, sans celles que l'élève a fermées", () => {
  const liste = [r("a", "2026-10-16T09:00:00Z"), r("b", "2026-10-15T11:00:00Z"), r("c", "2026-10-16T11:00:00Z")];
  assert.deepEqual(alertesActives(liste, M).map((x) => x.id), ["c", "a"]); // « b » a plus de 24 h
  assert.deepEqual(alertesActives(liste, M, new Set(["c"])).map((x) => x.id), ["a"]);
});

test("texte : pseudo de l'élève, et le nombre d'autres résultats", () => {
  assert.equal(texteAlerte({ auteur: "KL-887" }, 0), "🎉 Bravo ! KL-887 a terminé son modèle");
  assert.equal(texteAlerte({ auteur: "KL-887" }, 2), "🎉 Bravo ! KL-887 a terminé son modèle (et 2 autres)");
});

test("légende : bornée, avec un texte par défaut", () => {
  assert.equal(legendeResultat("  Ma  robe  portefeuille "), "Ma robe portefeuille");
  assert.equal(legendeResultat(""), "Mon modèle est terminé ! 🎉");
  assert.equal(legendeResultat("x".repeat(400)).length, 300);
});
