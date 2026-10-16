import { test } from "node:test";
import assert from "node:assert/strict";
import {
  AIMES_REQUIS, PAUSE_INVITATION_MS, SEUIL_INVITATION, cadeauDebloque, defiEnCours, doitInviter, estInscriteSelon, etapesBienvenue,
  formationSuggeree, lireDefi, statutPublication,
} from "./regles";

const M = new Date("2026-10-16T12:00:00Z");

test("inscrite : une formation ou l'équipe ; sinon visiteuse", () => {
  assert.equal(estInscriteSelon({ roles: ["eleve"], inscriptions: 1 }), true);
  assert.equal(estInscriteSelon({ roles: ["eleve"], inscriptions: 0 }), false);
  assert.equal(estInscriteSelon({ roles: ["formateur", "eleve"], inscriptions: 0 }), true);
  assert.equal(estInscriteSelon({ roles: ["patronniste"], inscriptions: 0 }), true);
});

test("A+B : la publication d'une visiteuse attend la validation, celle d'une élève part tout de suite", () => {
  assert.deepEqual(statutPublication(false), { published: false, a_valider: true });
  assert.deepEqual(statutPublication(true), { published: true, a_valider: false });
});

test("mission de bienvenue : 4 étapes, le cadeau seulement quand tout est fait, puis acquis", () => {
  const base = { testFait: true, suitEnseignante: true, aimes: AIMES_REQUIS - 1, aRepondu: true };
  const e = etapesBienvenue(base);
  assert.deepEqual(e.map((x) => x.cle), ["test", "suivre", "aimer", "question"]);
  assert.equal(e.find((x) => x.cle === "aimer")?.fait, false);
  assert.match(e.find((x) => x.cle === "aimer")?.detail ?? "", /2 \/ 3/);
  assert.equal(cadeauDebloque(e, false), false);
  assert.equal(cadeauDebloque(etapesBienvenue({ ...base, aimes: 7 }), false), true);
  assert.match(etapesBienvenue({ ...base, aimes: 7 }).find((x) => x.cle === "aimer")?.detail ?? "", /3 \/ 3/);
  // Déjà débloqué : il le reste même si elle retire un « j'aime ».
  assert.equal(cadeauDebloque(e, true), true);
});

test("défi : celui en cours, le plus récent ; rien avant le début ni après la fin", () => {
  const d = (id: string, debut: string, fin: string) => ({ id, debut, fin });
  const liste = [d("ancien", "2026-10-01T00:00:00Z", "2026-10-08T00:00:00Z"), d("actuel", "2026-10-12T00:00:00Z", "2026-10-19T00:00:00Z"), d("futur", "2026-10-20T00:00:00Z", "2026-10-27T00:00:00Z")];
  assert.equal(defiEnCours(liste, M)?.id, "actuel");
  assert.equal(defiEnCours(liste, new Date("2026-10-19T00:00:00Z")), null);
  assert.equal(defiEnCours([...liste, d("recent", "2026-10-15T00:00:00Z", "2026-10-22T00:00:00Z")], M)?.id, "recent");
});

test("défi : saisie vérifiée (titre, fin entre 1 h et 31 jours)", () => {
  assert.equal(lireDefi({ titre: "Coudre une trousse", fin: "2026-10-23T18:00:00Z", consigne: " Une trousse zippée ", recompense: "-20 %" }, M).ok, true);
  assert.equal(lireDefi({ titre: "x", fin: "2026-10-23T18:00:00Z" }, M).ok, false);
  assert.equal(lireDefi({ titre: "Trousse", fin: "2026-10-16T12:30:00Z" }, M).ok, false);
  assert.equal(lireDefi({ titre: "Trousse", fin: "2026-12-30T12:00:00Z" }, M).ok, false);
  assert.equal(lireDefi({ titre: "Trousse", fin: "pas une date" }, M).ok, false);
});

test("envie : la formation de la vidéo, sinon le niveau du test, sinon le Niveau 1", () => {
  assert.deepEqual(formationSuggeree({ courseSlug: "niveau-2", courseTitre: "Niveau 2 — Classique" }, "niveau-1"), { titre: "Niveau 2 — Classique", href: "/formations/niveau-2" });
  assert.deepEqual(formationSuggeree({ courseSlug: null, courseTitre: null }, "niveau-3"), { titre: "Niveau 3", href: "/formation/niveau-3" });
  assert.deepEqual(formationSuggeree({ courseSlug: null, courseTitre: null }, "debutante"), { titre: "Niveau 1", href: "/formation/niveau-1" });
  assert.deepEqual(formationSuggeree({ courseSlug: null, courseTitre: null }, null), { titre: "Niveau 1", href: "/formation/niveau-1" });
});

test("invitation : après 5 gestes, puis pas avant 3 jours si elle l'a refermée", () => {
  const t = M.getTime();
  assert.equal(doitInviter(SEUIL_INVITATION - 1, null, t), false);
  assert.equal(doitInviter(SEUIL_INVITATION, null, t), true);
  assert.equal(doitInviter(9, t - 1000, t), false);
  assert.equal(doitInviter(9, t - PAUSE_INVITATION_MS, t), true);
});
