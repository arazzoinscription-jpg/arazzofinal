import { test } from "node:test";
import assert from "node:assert/strict";
import { aSonner, etatCloche, lireQuand, notificationCloche, validerMessageCloche } from "./regles";

const M = new Date("2026-10-16T18:00:00Z"); // 19:00 à Alger

test("message : borné, espaces normalisés", () => {
  assert.deepEqual(validerMessageCloche("  🔔  La classe   commence ! "), { ok: true, message: "🔔 La classe commence !" });
  assert.equal(validerMessageCloche("x").ok, false);
  assert.equal(validerMessageCloche("a".repeat(201)).ok, false);
  assert.equal(validerMessageCloche(null).ok, false);
});

test("quand : maintenant, heure d'Alger, jamais dans le passé ni trop loin", () => {
  assert.deepEqual(lireQuand("maintenant", M), { ok: true, iso: M.toISOString(), immediat: true });
  assert.deepEqual(lireQuand("2026-10-16T20:00", M), { ok: true, iso: "2026-10-16T19:00:00.000Z", immediat: false });
  assert.equal(lireQuand("2026-10-16T18:30", M).ok, false); // 18:30 Alger = déjà passé
  assert.equal(lireQuand("2027-02-01T10:00", M).ok, false); // au-delà de 60 jours
  assert.equal(lireQuand("demain", M).ok, false);
  assert.equal(lireQuand("2026-10-16T20:00'; drop", M).ok, false);
});

test("à sonner : échéance atteinte, ni envoyée ni annulée, pas plus de 2 h de retard", () => {
  const base = { envoyee_le: null, annulee_le: null };
  assert.equal(aSonner({ ...base, sonne_le: "2026-10-16T18:00:20Z" }, M), true); // dans les 30 s
  assert.equal(aSonner({ ...base, sonne_le: "2026-10-16T18:05:00Z" }, M), false); // plus tard
  assert.equal(aSonner({ ...base, sonne_le: "2026-10-16T15:30:00Z" }, M), false); // 2 h 30 de retard
  assert.equal(aSonner({ ...base, sonne_le: "2026-10-16T17:00:00Z", envoyee_le: "x" }, M), false);
  assert.equal(aSonner({ ...base, sonne_le: "2026-10-16T17:00:00Z", annulee_le: "x" }, M), false);
  assert.equal(etatCloche({ ...base, sonne_le: "2026-10-16T15:00:00Z" }, M), "manquee");
  assert.equal(etatCloche({ ...base, sonne_le: "2026-10-16T19:00:00Z" }, M), "programmee");
});

test("notification : type « cloche » (vibration de cloche sur le téléphone), lien vers Ma classe", () => {
  assert.deepEqual(notificationCloche("La classe commence !"), { type: "cloche", title: "🔔 La classe commence !", body: "Votre enseignante fait sonner la cloche de la classe.", link: "/dashboard/classe" });
  assert.equal(notificationCloche("🔔 Déjà une cloche").title, "🔔 Déjà une cloche");
});
