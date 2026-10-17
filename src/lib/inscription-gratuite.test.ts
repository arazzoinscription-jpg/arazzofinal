import { test } from "node:test";
import assert from "node:assert/strict";
import { DELAI_HUMAIN_MS, estRobot, lireInscription, motDePasseLisible, suggestionEmail } from "./inscription-gratuite";

test("saisie : nom et e-mail obligatoires, adresse jetable refusée, téléphone nettoyé", () => {
  const ok = lireInscription({ nom: "  Amina   Belkacem ", email: " Amina@Gmail.com ", telephone: "0555 12 34 56", wilaya: "Sétif" });
  assert.deepEqual(ok, { ok: true, donnees: { nom: "Amina Belkacem", email: "amina@gmail.com", telephone: "0555123456", wilaya: "Sétif" } });
  assert.deepEqual(lireInscription({ nom: "A", email: "a@b.com" }), { ok: false, erreur: "nom" });
  assert.deepEqual(lireInscription({ nom: "Amina", email: "amina@gmail" }), { ok: false, erreur: "email" });
  assert.deepEqual(lireInscription({ nom: "Amina", email: "x@yopmail.com" }), { ok: false, erreur: "jetable" });
});

test("faute de frappe dans l'adresse : une correction proposée", () => {
  assert.equal(suggestionEmail("amina@gmial.com"), "amina@gmail.com");
  assert.equal(suggestionEmail("Sara@HOTMIAL.com"), "sara@hotmail.com");
  assert.equal(suggestionEmail("amina@gmail.com"), null);
  assert.equal(suggestionEmail("pas-une-adresse"), null);
});

test("robots : champ piège rempli ou envoi trop rapide", () => {
  const t = 1_000_000;
  assert.equal(estRobot({ piege: "", ouvertLe: t - 10_000, maintenant: t }), false);
  assert.equal(estRobot({ piege: "http://spam", ouvertLe: t - 10_000, maintenant: t }), true);
  assert.equal(estRobot({ piege: "", ouvertLe: t - (DELAI_HUMAIN_MS - 100), maintenant: t }), true);
  assert.equal(estRobot({ piege: "", ouvertLe: "n'importe quoi", maintenant: t }), true);
});

test("mot de passe lisible : 9 caractères, sans caractères ambigus", () => {
  const m = motDePasseLisible(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]));
  assert.match(m, /^[A-Z][a-z]{3}-[2-9]{4}$/);
  assert.doesNotMatch(m, /[01oOlI]/);
});
