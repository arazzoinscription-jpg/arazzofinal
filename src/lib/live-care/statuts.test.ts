import { test } from "node:test";
import assert from "node:assert/strict";
import { celluleInvitationPrevue, celluleInvitationEnvoyee, CELLULE_PRESENCE_CONFIRMEE, CELLULE_PRESENCE_REELLE, type RappelPourStatut } from "./statuts";
import { livesVisibles } from "./visibles";

test("directs « groupe » / « lien secret » jamais listés dans l'espace élève", () => {
  const lives = [
    { id: "pub", course_id: null, audience: "public" },
    { id: "grp", course_id: null, audience: "group" },
    { id: "lien", course_id: null, audience: "link" },
    { id: "ancien", course_id: null },
  ];
  assert.deepEqual(livesVisibles(lives, new Set(), new Map()).map((l) => l.id), ["pub", "ancien"]);
});

const maintenant = new Date("2026-10-25T12:00:00Z");
const r = (o: Partial<RappelPourStatut>): RappelPourStatut => ({ canal: "notification", statut: "prevu", prevu_le: "2026-10-27T18:00:00.000Z", envoye_le: null, fournisseur_id: null, ...o });

test("invitation prévue / aucune", () => {
  assert.equal(celluleInvitationPrevue([r({})], true, maintenant).etat, "valeur");
  assert.equal(celluleInvitationPrevue([], true, maintenant).etat, "aucune");
  assert.equal(celluleInvitationPrevue([r({ statut: "annule" })], true, maintenant).etat, "aucune");
  assert.match(celluleInvitationPrevue([r({ canal: "email" })], false, maintenant).detail ?? "", /désinscrite/);
  // Désinscrite : l'e-mail est retiré du compte et signalé dans le texte visible.
  const mixte = celluleInvitationPrevue([r({ canal: "email" }), r({ canal: "notification" })], false, maintenant);
  assert.match(mixte.texte, /^1 rappel\(s\) prévu\(s\) — Notification interne \(e-mail exclu/);
  assert.equal(celluleInvitationPrevue([r({ canal: "email" })], false, maintenant).etat, "aucune");
  assert.match(celluleInvitationPrevue([r({ canal: "email" }), r({ canal: "notification" })], null, maintenant).texte, /^2 rappel/);
});

test("invitation envoyée : JAMAIS sans confirmation", () => {
  assert.equal(celluleInvitationEnvoyee([r({})], null, maintenant).texte, "Aucun envoi confirmé");
  assert.equal(celluleInvitationEnvoyee([r({ statut: "envoye" })], null, maintenant).texte, "Aucun envoi confirmé"); // statut sans preuve
  assert.equal(celluleInvitationEnvoyee([r({ statut: "envoye", envoye_le: "2026-10-27T18:00:03Z", fournisseur_id: "x" })], null, maintenant).etat, "valeur");
  const preuve = { notification_le: "2026-10-26T08:00:05Z", email_le: null, email_statut: null };
  assert.match(celluleInvitationEnvoyee([], preuve, maintenant).texte, /système existant/);
  assert.match(celluleInvitationEnvoyee([], { notification_le: null, email_le: "2026-10-26T08:00:05Z", email_statut: "skipped" }, maintenant).texte, /non parti/);
});

test("présence : jamais inventée", () => {
  assert.equal(CELLULE_PRESENCE_CONFIRMEE.etat, "indisponible");
  assert.equal(CELLULE_PRESENCE_REELLE.etat, "non_enregistree");
});

test("élève : lives de ses cours (niveaux multiples compris), jamais les lives annulés", () => {
  const lives = [
    { id: "global", course_id: null },
    { id: "n1", course_id: "c1" },
    { id: "n2", course_id: "c2" },
    { id: "multi", course_id: "c1" },
    { id: "annule", course_id: "c1", cancelled_at: "2026-10-24T10:00:00Z" },
  ];
  const liens = new Map([["multi", ["c1", "c2"]]]);
  assert.deepEqual(livesVisibles(lives, new Set(["c2"]), liens).map((l) => l.id), ["global", "n2", "multi"]);
  assert.deepEqual(livesVisibles(lives, new Set(["c1"]), liens).map((l) => l.id), ["global", "n1", "multi"]);
});
