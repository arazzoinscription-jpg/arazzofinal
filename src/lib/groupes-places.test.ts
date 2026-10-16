import { test } from "node:test";
import assert from "node:assert/strict";
import { groupeAAfficher, jaugeDe, libelleGroupe, lireReglagesInscription, type GroupeOuvert } from "./groupes-places";

const g = (id: string, capacite: number | null, prises: number, debut: string | null = null): GroupeOuvert => ({ id, nom: `Groupe ${id}`, debut, capacite, prises });

test("landing : le premier groupe qui a encore de la place, sinon le dernier (complet)", () => {
  assert.equal(groupeAAfficher([g("a", 10, 10), g("b", 12, 3)])?.id, "b");
  assert.equal(groupeAAfficher([g("a", 10, 10), g("b", 12, 12)])?.id, "b");
  assert.equal(groupeAAfficher([g("a", null, 4)]), null); // sans nombre de places : pas de jauge
  assert.equal(groupeAAfficher([]), null);
});

test("jauge : places prises (rouges) = membres, intéressées = demandes en attente", () => {
  assert.deepEqual(jaugeDe([g("a", 12, 7, "2026-11-03")], 4), { total: 12, taken: 7, interested: 4, groupe: "Groupe a · début le 3 novembre" });
  assert.equal(jaugeDe([g("a", 10, 14)], 0)?.taken, 10); // jamais plus de places prises que de places
  assert.equal(jaugeDe([], 3), null);
  assert.equal(libelleGroupe({ nom: "Promo", debut: null }), "Promo");
});

test("réglages : places 1 à 500, ouverture seulement avec un nombre de places", () => {
  assert.deepEqual(lireReglagesInscription({ capacite: "12", debut: "2026-11-03", ouverte: true }), { ok: true, capacite: 12, debut: "2026-11-03", ouverte: true });
  assert.equal(lireReglagesInscription({ capacite: 0, ouverte: false }).ok, false);
  assert.equal(lireReglagesInscription({ capacite: 2.5 }).ok, false);
  assert.equal(lireReglagesInscription({ capacite: "", ouverte: true }).ok, false);
  assert.deepEqual(lireReglagesInscription({ capacite: null, debut: "pas une date", ouverte: false }), { ok: true, capacite: null, debut: null, ouverte: false });
});
