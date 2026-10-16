import { test } from "node:test";
import assert from "node:assert/strict";
import { lienAutorise, lienRefuse, lireCalques, lireFond, lireInteraction, resultatSondage, tempsRestant, type Calque } from "./calques";

const M = new Date("2026-10-16T12:00:00Z");
const lire = (b: unknown, equipe = false) => lireCalques(b, { equipe, maintenant: M });

test("texte : borné, couleur de la palette, position dans l'image", () => {
  const [t] = lire([{ id: "t1", type: "texte", texte: "  Ma   robe\n\n\n\nfinie ", couleur: "#123456", x: 2, y: -1, taille: 9, fond: "plein", align: "gauche" }]);
  assert.deepEqual(t, { id: "t1", type: "texte", texte: "Ma robe\n\nfinie", couleur: "#FFFFFF", fond: "plein", align: "gauche", x: 0.97, y: 0.03, taille: 3 });
  assert.equal(lire([{ type: "texte", texte: "   " }]).length, 0);
});

test("autocollant : un émoji, jamais du texte libre", () => {
  assert.equal(lire([{ type: "emoji", emoji: "✂️" }])[0]?.type, "emoji");
  assert.equal(lire([{ type: "emoji", emoji: "<script>" }]).length, 0);
  assert.equal(lire([{ type: "emoji", emoji: "abc" }]).length, 0);
});

test("dessin : points ramenés dans l'image, trait trop court ignoré", () => {
  const [d] = lire([{ id: "d1", type: "dessin", couleur: "#FE7223", epaisseur: 1, points: [[0.1, 0.2], [1.5, -3], ["x", 1]] }]);
  assert.deepEqual(d, { id: "d1", type: "dessin", couleur: "#FE7223", epaisseur: 0.04, points: [[0.1, 0.2], [1, 0]] });
  assert.equal(lire([{ type: "dessin", points: [[0.1, 0.1]] }]).length, 0);
});

test("question, sondage, compte à rebours (1 min à 30 jours)", () => {
  const c = lire([
    { id: "q", type: "question", question: "Votre tissu préféré ?" },
    { id: "s", type: "sondage", question: "Jupe ou robe ?", choix: ["Jupe", "Robe"] },
    { id: "s2", type: "sondage", question: "Incomplet", choix: ["Oui"] },
    { id: "k", type: "compte", titre: "Live correction", fin: "2026-10-17T18:00:00Z" },
    { id: "k2", type: "compte", titre: "Passé", fin: "2026-10-15T18:00:00Z" },
  ]);
  assert.deepEqual(c.map((x) => x.id), ["q", "s", "k"]);
});

test("lien : pages du site pour toutes, https pour l'équipe seulement", () => {
  assert.equal(lienAutorise("/formation/niveau-1", false), "/formation/niveau-1");
  assert.equal(lienAutorise("//pirate.example", false), null);
  assert.equal(lienAutorise("https://exemple.com/x", false), null);
  assert.equal(lienAutorise("https://exemple.com/x", true), "https://exemple.com/x");
  assert.equal(lienAutorise("javascript:alert(1)", true), null);
  assert.equal(lire([{ type: "lien", texte: "Ma page", url: "https://exemple.com" }]).length, 0);
  assert.equal(lire([{ type: "lien", texte: "Ma page", url: "https://exemple.com" }], true).length, 1);
});

test("fond : seulement ceux de la palette ; au plus 25 calques", () => {
  assert.equal(lireFond("#111111"), "#111111");
  assert.equal(lireFond("url(javascript:x)"), null);
  assert.equal(lire(Array.from({ length: 40 }, () => ({ type: "emoji", emoji: "✨" }))).length, 25);
});

test("interactions : réponse à une question, vote 0/1, réaction de la liste", () => {
  const calques = lire([{ id: "q", type: "question", question: "Q ?" }, { id: "s", type: "sondage", question: "S ?", choix: ["A", "B"] }]) as Calque[];
  assert.deepEqual(lireInteraction({ calqueId: "q", kind: "reponse", valeur: "  Le lin  " }, calques), { calqueId: "q", kind: "reponse", valeur: "Le lin" });
  assert.equal(lireInteraction({ calqueId: "s", kind: "reponse", valeur: "x" }, calques), null);
  assert.deepEqual(lireInteraction({ calqueId: "s", kind: "vote", valeur: "1" }, calques), { calqueId: "s", kind: "vote", valeur: "1" });
  assert.equal(lireInteraction({ calqueId: "s", kind: "vote", valeur: "2" }, calques), null);
  assert.deepEqual(lireInteraction({ kind: "reaction", valeur: "🔥" }, calques), { calqueId: "", kind: "reaction", valeur: "🔥" });
  assert.equal(lireInteraction({ kind: "reaction", valeur: "💩" }, calques), null);
});

test("sondage et compte à rebours : résultats lisibles", () => {
  assert.deepEqual(resultatSondage(["0", "1", "1", "1"]), { nombres: [1, 3], pct: [25, 75], total: 4 });
  assert.deepEqual(resultatSondage([]), { nombres: [0, 0], pct: [0, 0], total: 0 });
  assert.equal(tempsRestant("2026-10-18T15:00:00Z", M), "2 j 3 h");
  assert.equal(tempsRestant("2026-10-16T15:05:00Z", M), "3 h 05");
  assert.equal(tempsRestant("2026-10-16T12:12:00Z", M), "12 min");
  assert.equal(tempsRestant("2026-10-16T11:00:00Z", M), "Terminé");
});

test("lien externe d'une élève : refusé ET signalé (jamais effacé en silence)", () => {
  const brut = [{ type: "lien", texte: "Mon site", url: "https://exemple.com" }];
  assert.equal(lienRefuse(brut, false), true);
  assert.equal(lienRefuse(brut, true), false);
  assert.equal(lienRefuse([{ type: "lien", url: "/communaute" }], false), false);
  assert.equal(lienRefuse([{ type: "texte", texte: "https://exemple.com" }], false), false);
});
