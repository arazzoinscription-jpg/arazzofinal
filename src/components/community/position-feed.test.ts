import { test } from "node:test";
import assert from "node:assert/strict";
import { indexAffiche, indexARestaurer, lirePosition, VALIDITE_POSITION_MS } from "./position-feed";

test("position du feed : seulement un retour récent et valide", () => {
  const t = 1_000_000_000;
  assert.deepEqual(lirePosition(JSON.stringify({ index: 4, empreinte: "/communaute/u/a|x", le: t - 5_000 }), t), { index: 4, empreinte: "/communaute/u/a|x", le: t - 5_000 });
  assert.equal(lirePosition(JSON.stringify({ index: 4, le: t - VALIDITE_POSITION_MS - 1 }), t), null);
  assert.equal(lirePosition(JSON.stringify({ index: 0, le: t }), t), null);
  assert.equal(lirePosition(JSON.stringify({ index: 2.5, le: t }), t), null);
  assert.equal(lirePosition("pas du json", t), null);
  assert.equal(lirePosition(null, t), null);
});

test("vidéo affichée = défilement / hauteur", () => {
  assert.equal(indexAffiche(0, 800), 0);
  assert.equal(indexAffiche(2400, 800), 3);
  assert.equal(indexAffiche(2390, 800), 3);
  assert.equal(indexAffiche(100, 0), 0);
});

test("retour : la même vidéo même si le feed a été mélangé, sinon on reste en haut", () => {
  const p = { index: 2, empreinte: "/communaute/u/k|Robe", le: 0 };
  assert.equal(indexARestaurer(p, ["/communaute/u/n|", "/communaute/u/i|", "/communaute/u/k|Robe"]), 2);
  assert.equal(indexARestaurer(p, ["/communaute/u/k|Robe", "/communaute/u/n|", "/communaute/u/i|"]), 0);
  assert.equal(indexARestaurer(p, ["/communaute/u/n|", "/communaute/u/i|"]), null);
  assert.equal(indexARestaurer({ index: 1, empreinte: "", le: 0 }, ["a", "b"]), 1);
  assert.equal(indexARestaurer({ index: 5, empreinte: "", le: 0 }, ["a", "b"]), null);
});
