import { test } from "node:test";
import assert from "node:assert/strict";
import { CORPS_COUR, DELAI_COUR_EQUIPE_MS, DELAI_COUR_MS, delaiCour, destinatairesCour, titreCour } from "./cour-notifications";

test("tout le monde, sauf l'autrice, celles qui ont coupé et celles déjà prévenues (sans doublon)", () => {
  const r = destinatairesCour({
    membres: ["a", "b", "c", "d", "e", "b", ""],
    auteurId: "a",
    coupees: new Set(["c"]),
    dejaPrevenues: new Set(["d"]),
  });
  assert.deepEqual(r, ["b", "e"]);
});

test("au plus une notification toutes les 3 h ; l'équipe en priorité (1 h)", () => {
  assert.equal(DELAI_COUR_MS, 3 * 3600_000);
  assert.equal(delaiCour(false), DELAI_COUR_MS);
  assert.equal(delaiCour(true), DELAI_COUR_EQUIPE_MS);
  assert.ok(DELAI_COUR_EQUIPE_MS < DELAI_COUR_MS);
});

test("titres : story, vidéo, travail, résultat ; jamais de nom vide", () => {
  assert.equal(titreCour("story", "Amina"), "✨ Amina a publié une story");
  assert.equal(titreCour("video", "Formatrice"), "🎬 Formatrice a partagé une vidéo");
  assert.equal(titreCour("publication", "B-823"), "🧵 B-823 a partagé son travail");
  assert.equal(titreCour("resultat", "Dounia"), "🎉 Dounia a terminé son modèle");
  assert.match(titreCour("story", "  "), /^✨ Quelqu'un/);
  assert.match(CORPS_COUR, /La Cour/);
});
