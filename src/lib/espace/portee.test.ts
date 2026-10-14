import { test } from "node:test";
import assert from "node:assert/strict";
import { baseDepuis, niveauxAutorises, voitCours, voitEleve, voitLive, type Espace } from "./portee";
import { commandesPour } from "../classe/communication";

const admin: Espace = { base: "/admin", userId: "a", estAdmin: true, cours: null };
const fatima: Espace = { base: "/formateur", userId: "f1", estAdmin: false, cours: new Set(["N1", "N2"]) };
const sansCours: Espace = { base: "/formateur", userId: "f9", estAdmin: false, cours: new Set() };

test("base : seules /admin et /formateur existent (jamais une adresse arbitraire)", () => {
  assert.equal(baseDepuis("/formateur"), "/formateur");
  assert.equal(baseDepuis("/admin"), "/admin");
  assert.equal(baseDepuis("https://exemple.test"), "/admin");
  assert.equal(baseDepuis(null), "/admin");
});

test("élèves : l'administration voit tout, la formatrice seulement les élèves de ses cours", () => {
  assert.equal(voitEleve(admin, [{ course_id: "N3" }]), true);
  assert.equal(voitEleve(fatima, [{ course_id: "N3" }]), false);
  assert.equal(voitEleve(fatima, [{ course_id: "N3" }, { course_id: "N2" }]), true);
  assert.equal(voitEleve(fatima, []), false);
  assert.equal(voitEleve(sansCours, [{ course_id: "N1" }]), false);
  assert.equal(voitCours(fatima, null), false);
});

test("lives : la formatrice voit ceux qu'elle anime ou dont TOUS les niveaux sont à elle", () => {
  assert.equal(voitLive(admin, { formateur_id: "x", course_id: null }, []), true);
  assert.equal(voitLive(fatima, { formateur_id: "f1", course_id: "N3" }, ["N3"]), true); // elle l'anime
  assert.equal(voitLive(fatima, { formateur_id: "x", course_id: "N1" }, ["N1", "N2"]), true);
  assert.equal(voitLive(fatima, { formateur_id: "x", course_id: "N1" }, ["N1", "N3"]), false); // un niveau d'une autre
  assert.equal(voitLive(fatima, { formateur_id: "x", course_id: "N2" }, []), true); // ancien live : course_id seul
  assert.equal(voitLive(fatima, { formateur_id: "x", course_id: null }, []), false); // live global d'une autre
});

test("niveaux proposés pour programmer un live", () => {
  const niveaux = [{ id: "N1" }, { id: "N2" }, { id: "N3" }];
  assert.deepEqual(niveauxAutorises(admin, niveaux).map((n) => n.id), ["N1", "N2", "N3"]);
  assert.deepEqual(niveauxAutorises(fatima, niveaux).map((n) => n.id), ["N1", "N2"]);
  assert.deepEqual(niveauxAutorises(sansCours, niveaux), []);
});

test("barre de commande : « Programmer un live » reste dans l'espace", () => {
  assert.equal(commandesPour("/formateur").find((c) => c.cle === "programmer_live")?.href, "/formateur/lives/nouveau");
  assert.equal(commandesPour("/admin").find((c) => c.cle === "programmer_live")?.href, "/admin/lives/nouveau");
});
