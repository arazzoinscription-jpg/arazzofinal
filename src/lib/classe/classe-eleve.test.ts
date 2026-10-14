import { test } from "node:test";
import assert from "node:assert/strict";
import { construireClasseEleve, nomCamarade } from "./classe-eleve";

const N1 = "23bee490-103a-492d-9253-256178658e02";
const N2 = "b100190c-4f95-4f63-bd22-7a561f9666de";
const AUTRE = "11111111-1111-4111-8111-111111111111";

const personne = (id: string, nom: string, role = "eleve", avatar: string | null = null) => ({ id, nom, avatar_url: avatar, role, roles: [role] });

test("classe élève : enseignante en haut, camarades des MÊMES cours, jamais l'équipe ni moi", () => {
  const r = construireClasseEleve({
    moi: "moi",
    cours: [{ id: N1, titre: "Niveau 1", formateur_id: "prof" }, { id: AUTRE, titre: "Patron numérique", formateur_id: "prof" }],
    inscriptions: [
      { user_id: "moi", course_id: N1 },
      { user_id: "amina", course_id: N1 },
      { user_id: "amina", course_id: AUTRE },
      { user_id: "basma", course_id: AUTRE },
      { user_id: "autre-niveau", course_id: N2 }, // pas un de mes cours
      { user_id: "admin", course_id: N1 },        // compte d'équipe inscrit
      { user_id: "prof", course_id: N1 },
    ],
    personnes: [
      personne("moi", "Moi"), personne("amina", "Amina Benali", "eleve", "https://cdn.exemple.test/a.jpg"),
      personne("basma", "Basma"), personne("autre-niveau", "Hors classe"),
      personne("admin", "Administratrice", "admin"), personne("prof", "Fatima Prof", "formateur", "javascript:alert(1)"),
    ],
  });
  assert.deepEqual(r.enseignantes.map((e) => [e.nom, e.niveaux.join("+"), e.avatar]), [["Fatima Prof", "N1+Patron numérique", null]]);
  assert.deepEqual(r.camarades.map((c) => [c.nom, c.niveaux.join("+")]), [["Amina B.", "N1+Patron numérique"], ["Basma", "Patron numérique"]]);
  assert.equal(r.camarades[0].avatar, "https://cdn.exemple.test/a.jpg");
});

test("camarades : pseudo s'il existe, sinon prénom + initiale — jamais le nom complet", () => {
  assert.equal(nomCamarade({ nom: "Amina Benali", username: "amina_couture" }), "amina_couture");
  assert.equal(nomCamarade({ nom: "Amina Benali Hadj", username: null }), "Amina H.");
  assert.equal(nomCamarade({ nom: "Fella (fictive)", username: "" }), "Fella");
  assert.equal(nomCamarade({ nom: null, username: null }), "Membre");
});

test("camarades : barre de progression par cours partagé (leçons terminées), jamais inventée", () => {
  const r = construireClasseEleve({
    moi: "moi",
    cours: [{ id: N1, titre: "Niveau 1", formateur_id: null }, { id: AUTRE, titre: "Patron numérique", formateur_id: null }],
    inscriptions: [{ user_id: "moi", course_id: N1 }, { user_id: "amina", course_id: N1 }, { user_id: "amina", course_id: AUTRE }, { user_id: "basma", course_id: N1 }],
    personnes: [personne("amina", "Amina"), personne("basma", "Basma")],
    progres: [
      { user_id: "amina", course_id: N1, faites: 3, total: 12 },
      { user_id: "amina", course_id: N1, faites: 6, total: 12 }, // 2e inscription au même cours : la plus avancée
      { user_id: "amina", course_id: AUTRE, faites: 0, total: 0 }, // cours sans leçon
    ],
  });
  const amina = r.camarades.find((c) => c.nom === "Amina")!;
  assert.deepEqual(amina.progression, [{ cours: "N1", pct: 50, faites: 6, total: 12 }, { cours: "Patron numérique", pct: null, faites: 0, total: 0 }]);
  assert.deepEqual(r.camarades.find((c) => c.nom === "Basma")!.progression, []); // donnée absente : pas de barre
});

test("classe élève : aucune donnée de suivi ne sort (seulement profil public + progression)", () => {
  const r = construireClasseEleve({
    moi: "moi",
    cours: [{ id: N1, titre: "Niveau 1", formateur_id: null }],
    inscriptions: [{ user_id: "moi", course_id: N1 }, { user_id: "amina", course_id: N1 }],
    personnes: [personne("amina", "Amina")],
  });
  assert.deepEqual(Object.keys(r.camarades[0]).sort(), ["avatar", "cle", "groupes", "id", "initiales", "niveaux", "nom", "progression"]);
  assert.deepEqual(r.enseignantes, []); // cours sans formatrice : rien d'inventé
});

test("groupes : l'élève ne voit QUE les camarades de ses groupes (pas les autres élèves du même cours)", () => {
  const r = construireClasseEleve({
    moi: "moi",
    cours: [{ id: N1, titre: "Niveau 1", formateur_id: "prof" }],
    inscriptions: [
      { user_id: "moi", course_id: N1 }, { user_id: "amina", course_id: N1 },
      { user_id: "basma", course_id: N1 }, { user_id: "chahra", course_id: N1 },
    ],
    personnes: [personne("amina", "Amina"), personne("basma", "Basma"), personne("dounia", "Dounia"), personne("prof", "Prof", "formateur"), personne("chahra", "Chahra")],
    groupes: [
      { id: "g1", nom: "Groupe du soir", membres: ["moi", "amina", "prof", "dounia"] }, // Dounia : autre cours, même groupe
      { id: "g2", nom: "Atelier robes", membres: ["moi", "amina"] },
    ],
  });
  // Basma et Chahra suivent le même cours mais ne sont dans aucun de mes groupes : invisibles ici.
  assert.deepEqual(r.camarades.map((c) => [c.nom, c.groupes.join("+"), c.niveaux.join("+")]), [["Amina", "g1+g2", "N1"], ["Dounia", "g1", ""]]);
  assert.deepEqual(r.groupes, [{ id: "g2", nom: "Atelier robes", nb: 1 }, { id: "g1", nom: "Groupe du soir", nb: 2 }]);
});

test("groupes : sans groupe, aucune camarade (et rien d'inventé)", () => {
  const r = construireClasseEleve({
    moi: "moi",
    cours: [{ id: N1, titre: "Niveau 1", formateur_id: null }],
    inscriptions: [{ user_id: "moi", course_id: N1 }, { user_id: "amina", course_id: N1 }],
    personnes: [personne("amina", "Amina")],
    groupes: [],
  });
  assert.deepEqual(r.camarades, []);
  assert.deepEqual(r.groupes, []);
});
