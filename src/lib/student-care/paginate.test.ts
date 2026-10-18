import { test } from "node:test";
import assert from "node:assert/strict";
import { lireTout, lireParIds, paquets, ErreurLecture } from "./paginate";

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

/** Simule `.in("user_id", lot).range(de, a)` : 12 inscriptions par élève, plafond silencieux de 1 000 lignes. */
function faussesInscriptions(nbEleves: number, parEleve: number) {
  const lignes = Array.from({ length: nbEleves * parEleve }, (_, i) => ({ id: i, user_id: `u${Math.floor(i / parEleve)}` }));
  const lots: string[][] = [];
  const lire = async (lot: string[], de: number, a: number) => {
    if (de === 0) lots.push(lot);
    const filtre = lignes.filter((l) => lot.includes(l.user_id));
    return { data: filtre.slice(de, de + Math.min(a - de + 1, 1000)), error: null };
  };
  return { lire, lots };
}

test("par identifiants : 300 élèves × 12 inscriptions = 3 600 lignes, toutes lues (pas 1 000 par paquet)", async () => {
  const f = faussesInscriptions(300, 12);
  const ids = Array.from({ length: 300 }, (_, i) => `u${i}`);
  const r = await lireParIds(ids, f.lire);
  assert.equal(r.length, 3600);
  assert.equal(new Set(r.map((x) => x.id)).size, 3600);
  assert.deepEqual(f.lots.map((l) => l.length), [150, 150]); // URL courte : 150 identifiants par demande
});

test("par identifiants : doublons et vides retirés, liste vide → aucune demande", async () => {
  const f = faussesInscriptions(3, 2);
  const r = await lireParIds(["u1", "u1", "", "u2"], f.lire);
  assert.deepEqual(r.map((x) => x.id), [2, 3, 4, 5]);
  assert.deepEqual(f.lots, [["u1", "u2"]]);
  assert.deepEqual(await lireParIds([], f.lire), []);
});

test("par identifiants : une erreur dans un paquet remonte", async () => {
  await assert.rejects(
    lireParIds(["a", "b"], async (lot) => ({ data: null, error: lot.includes("b") ? { message: "timeout" } : null }), { taillePaquet: 1 }),
    ErreurLecture,
  );
});
