import { test } from "node:test";
import assert from "node:assert/strict";
import { reconcilier, echeance, etatRappel, fenetreCronExistant, validerRegle, type RappelExistant, type RegleRappel } from "./rappels";

const live = { starts_at: "2026-10-27T19:00:00.000Z", duree_minutes: 90, annule: false }; // 20:00 à Alger
const maintenant = new Date("2026-10-25T12:00:00Z");
const R = (moment: RegleRappel["moment"], decalage_minutes: number, canal: RegleRappel["canal"] = "notification"): RegleRappel => ({ moment, decalage_minutes, canal });

test("échéances : avant, au démarrage, après la FIN (durée comprise)", () => {
  assert.equal(echeance(R("avant", 1440), live.starts_at, 90), "2026-10-26T19:00:00.000Z");
  assert.equal(echeance(R("avant", 60), live.starts_at, 90), "2026-10-27T18:00:00.000Z");
  assert.equal(echeance(R("debut", 0), live.starts_at, 90), live.starts_at);
  assert.equal(echeance(R("apres", 60), live.starts_at, 90), "2026-10-27T21:30:00.000Z");
});

test("première planification : un rappel par règle, jamais deux fois la même", () => {
  const p = reconcilier([], [R("avant", 1440), R("avant", 1440), R("debut", 0, "email")], live, maintenant);
  assert.equal(p.aCreer.length, 2);
  assert.deepEqual(p.aReplanifier, []);
});

test("WhatsApp écarté avec sa raison (aucun envoi possible)", () => {
  const p = reconcilier([], [R("avant", 60, "whatsapp")], live, maintenant);
  assert.equal(p.aCreer.length, 0);
  assert.match(p.ecartes[0].raison, /WhatsApp/);
});

test("échéance déjà passée : non planifiée, et signalée", () => {
  const p = reconcilier([], [R("avant", 4 * 1440)], live, maintenant);
  assert.equal(p.aCreer.length, 0);
  assert.match(p.ecartes[0].raison, /passée/);
});

const existant = (o: Partial<RappelExistant>): RappelExistant => ({ id: "r1", moment: "avant", decalage_minutes: 60, canal: "notification", statut: "prevu", prevu_le: "2026-10-27T18:00:00.000Z", ...o });

test("heure du live modifiée : le rappel est REPLANIFIÉ, pas dupliqué", () => {
  const p = reconcilier([existant({})], [R("avant", 60)], { ...live, starts_at: "2026-10-27T20:00:00.000Z" }, maintenant);
  assert.deepEqual(p.aCreer, []);
  assert.deepEqual(p.aReplanifier, [{ id: "r1", prevu_le: "2026-10-27T19:00:00.000Z" }]);
});

test("replanifier deux fois de suite sans changement : aucune opération (idempotent)", () => {
  const p = reconcilier([existant({})], [R("avant", 60)], live, maintenant);
  assert.deepEqual([p.aCreer, p.aReplanifier, p.aAnnuler], [[], [], []]);
});

test("live annulé : tous les rappels prévus passent en « annulé »", () => {
  const p = reconcilier([existant({}), existant({ id: "r2", statut: "envoye" })], [R("avant", 60)], { ...live, annule: true }, maintenant);
  assert.deepEqual(p.aAnnuler, ["r1"]);
  assert.deepEqual(p.aCreer, []);
});

test("rappel retiré : annulé ; rappel déjà envoyé : jamais touché", () => {
  const p = reconcilier([existant({}), existant({ id: "r2", moment: "debut", decalage_minutes: 0, statut: "envoye" })], [], live, maintenant);
  assert.deepEqual(p.aAnnuler, ["r1"]);
});

test("« envoyé » seulement avec confirmation complète", () => {
  const base = { prevu_le: "2026-10-27T18:00:00.000Z", envoye_le: null, fournisseur_id: null };
  assert.equal(etatRappel({ ...base, statut: "prevu" }, maintenant).code, "prevu");
  assert.equal(etatRappel({ ...base, statut: "prevu" }, new Date("2026-10-28T00:00:00Z")).code, "echu_non_envoye");
  assert.equal(etatRappel({ ...base, statut: "envoye" }, maintenant).code, "incoherent");
  assert.equal(etatRappel({ ...base, statut: "envoye", envoye_le: "2026-10-27T18:00:05Z", fournisseur_id: "re_123" }, maintenant).code, "envoye");
});

test("fenêtre du cron existant (08:00 UTC) : risque de doublon détecté", () => {
  assert.deepEqual(fenetreCronExistant("2026-10-27T19:00:00.000Z"), { veille: false, heure: false }); // 20:00 Alger : hors fenêtre
  assert.deepEqual(fenetreCronExistant("2026-10-27T08:00:00.000Z"), { veille: true, heure: true });   // 09:00 Alger
  assert.deepEqual(fenetreCronExistant("2026-10-27T06:30:00.000Z"), { veille: true, heure: false });
});

test("règles invalides refusées", () => {
  assert.throws(() => validerRegle(R("debut", 10)));
  assert.throws(() => validerRegle(R("avant", 2)));
  assert.throws(() => validerRegle(R("apres", 5000)));
});
