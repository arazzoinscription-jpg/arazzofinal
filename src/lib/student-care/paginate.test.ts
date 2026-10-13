import { test } from "node:test";
import assert from "node:assert/strict";
import { lireTout, paquets, ErreurLecture } from "./paginate";

/** Simule PostgREST : plafond silencieux de `plafond` lignes par réponse, quelle que soit la demande. */
function faussesLignes(total: number, plafond: number) {
  const lignes = Array.from({ length: total }, (_, i) => ({ id: i }));
  let appels = 0;
  const lire = async (de: number, a: number) => {
    appels += 1;
    const demande = a - de + 1;
    return { data: lignes.slice(de, de + Math.min(demande, plafond)), error: null };
  };
  return { lire, appels: () => appels };
}

test("au-delà de 1 000 inscriptions : tout est lu, rien n'est tronqué", async () => {
  const f = faussesLignes(2500, 1000);
  const r = await lireTout(f.lire);
  assert.equal(r.lignes.length, 2500);
  assert.equal(r.complet, true);
  assert.deepEqual(r.lignes.map((x) => x.id), Array.from({ length: 2500 }, (_, i) => i));
  assert.equal(f.appels(), 4); // 1000 + 1000 + 500 + page vide
});

test("un plafond serveur PLUS BAS que la page demandée ne fait rien perdre", async () => {
  const f = faussesLignes(1234, 500);
  const r = await lireTout(f.lire);
  assert.equal(r.lignes.length, 1234);
  assert.equal(r.complet, true);
});

test("exactement 1 000 lignes : la page vide finale confirme la fin", async () => {
  const r = await lireTout(faussesLignes(1000, 1000).lire);
  assert.equal(r.lignes.length, 1000);
  assert.equal(r.complet, true);
});

test("le garde-fou de pages signale une lecture incomplète au lieu de la cacher", async () => {
  const r = await lireTout(faussesLignes(5000, 1000).lire, { pagesMax: 2 });
  assert.equal(r.lignes.length, 2000);
  assert.equal(r.complet, false);
});

test("une erreur de lecture remonte, elle n'est jamais avalée", async () => {
  await assert.rejects(
    lireTout(async () => ({ data: null, error: { message: "permission denied" } })),
    ErreurLecture,
  );
});

test("découpage en paquets", () => {
  assert.deepEqual(paquets([1, 2, 3, 4, 5], 2), [[1, 2], [3, 4], [5]]);
  assert.deepEqual(paquets([], 3), []);
  assert.throws(() => paquets([1], 0));
});
