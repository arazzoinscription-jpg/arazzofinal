import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import type { SuiviEleve } from "../student-care/rules";
import {
  avatarSur, compterTeintes, filtrerCartes, initiales, lireFiltresClasse, normaliser, teinte, trierCartes, versCarte,
  LIBELLE_TEINTE, TEINTES, type CarteEleve,
} from "./vue";
import { COMMANDES, lienMailto, lienWhatsApp, modeleMessage, prenom } from "./communication";

const maintenant = new Date("2026-10-13T12:00:00Z");
const il = (j: number) => new Date(maintenant.getTime() - j * 86_400_000).toISOString();

function suivi(o: Partial<SuiviEleve> = {}): SuiviEleve {
  return {
    user_id: "u1", nom: "Amina Benali", email: "amina@exemple.test", pseudo: null, telephone: null,
    suivie_depuis: il(30), premiere_inscription: il(30), niveaux: ["N1"], formations: [], reference: null, historique: null,
    importee: false, derniere_auth: il(1), derniere_connexion_journal: null, derniere_activite: { le: il(2), genre: "lecon" },
    derniere_video: null, derniere_lecon_consultee: null, jours_sans_activite: 2,
    quiz: { applicable: true, tentatives: 0, reussis: 0, epuises: 0, dernier_score: null },
    travaux: { lecons: 0, valides: 0, a_corriger: 0, a_refaire: 0, plus_ancien_a_corriger: null },
    questions: { posees: 0, sans_reponse: 0 }, certificats: { nombre: 0, dernier_le: null },
    relances: { reactivation_le: null, reactivation_palier: null, rappel_lecon_le: null },
    statut: "active", blocages: [], taches_enseignante: [], etape_terminee: false, derniere_etape_le: null,
    action: { code: "aucune", libelle: "Rien à signaler", raison: "" },
    ...o,
  } as SuiviEleve;
}

test("couleurs : vert / jaune / rouge suivent le statut du suivi, sans rien recalculer", () => {
  assert.equal(teinte(suivi({ statut: "active" })), "vert");
  assert.equal(teinte(suivi({ statut: "ralentie" })), "jaune");
  assert.equal(teinte(suivi({ statut: "inactive" })), "rouge");
});

test("jamais connectée, connectée sans progresser et données indisponibles sont distinctes", () => {
  assert.equal(teinte(suivi({ statut: "jamais_connectee", derniere_activite: null })), "jamais");
  assert.equal(teinte(suivi({ statut: "sans_activite", derniere_activite: null })), "sans_progression");
  // Importée de l'ancien système, rien de capté depuis : on ne sait pas → pas « sans progression ».
  assert.equal(teinte(suivi({ statut: "sans_activite", derniere_activite: null, importee: true })), "indisponible");
  // Importée mais jamais connectée : ça, on le sait.
  assert.equal(teinte(suivi({ statut: "jamais_connectee", derniere_activite: null, importee: true })), "jamais");
  // Importée avec une activité captée : couleur normale.
  assert.equal(teinte(suivi({ statut: "active", importee: true })), "vert");
});

test("aucun libellé ne prétend qu'une élève est « en ligne »", () => {
  for (const t of TEINTES) assert.doesNotMatch(LIBELLE_TEINTE[t], /en ligne|connectée maintenant|online/i);
});

test("carte : progression jamais inventée, activité en clair, connexion récente sans progrès signalée", () => {
  const ref = { enrollment_id: "e", course_id: "c", titre: "Niveau 1", genre: "niveau", niveau: "N1", suivie: true, inscrite_le: il(30), lecons_faites: 3, lecons_total: 12, pourcentage: 25, modules_faits: 1, modules_total: 4, derniere_lecon_titre: null, derniere_lecon_le: il(20), quiz_total: 0, certificat_le: null } as SuiviEleve["formations"][number];
  const c = versCarte(suivi({ reference: ref, statut: "inactive", derniere_activite: { le: il(20), genre: "lecon" }, derniere_auth: il(1) }), null, maintenant, 7);
  assert.deepEqual(c.progression, { pct: 25, faites: 3, total: 12, titre: "Niveau 1" });
  assert.equal(c.activite?.libelle, "Leçon terminée");
  assert.equal(c.activite?.quand, "il y a 20 j");
  assert.match(c.connexion_sans_progres ?? "", /Connectée hier, mais sans activité pédagogique depuis/);
  const sansLecon = versCarte(suivi({ reference: { ...ref, pourcentage: null } }), null, maintenant, 7);
  assert.equal(sansLecon.progression?.pct, null);
  const sansRef = versCarte(suivi({ reference: null, derniere_activite: null, statut: "sans_activite" }), null, maintenant, 7);
  assert.equal(sansRef.progression, null);
  assert.equal(sansRef.activite, null);
});

test("photo : seulement http(s), sinon initiales", () => {
  assert.equal(avatarSur("https://cdn.exemple.test/a.jpg"), "https://cdn.exemple.test/a.jpg");
  assert.equal(avatarSur("javascript:alert(1)"), null);
  assert.equal(avatarSur("data:image/png;base64,AAAA"), null);
  assert.equal(avatarSur(null), null);
  assert.equal(initiales("Amina Benali"), "AB");
  assert.equal(initiales("fella"), "F");
  assert.equal(initiales("Chahra (fictive)"), "C");
  assert.equal(initiales("  "), "?");
});

test("recherche sans accents, filtres niveau et statut, tri par urgence", () => {
  const cartes = [
    versCarte(suivi({ user_id: "a", nom: "Hélène Martin", niveaux: ["N1"], statut: "active" }), null, maintenant, 7),
    versCarte(suivi({ user_id: "b", nom: "Basma", niveaux: ["N2"], statut: "inactive" }), null, maintenant, 7),
    versCarte(suivi({ user_id: "c", nom: "Chahra", niveaux: ["N1", "N2"], statut: "jamais_connectee", derniere_activite: null }), null, maintenant, 7),
  ];
  assert.equal(normaliser("  HÉLÈNE "), "helene");
  assert.deepEqual(filtrerCartes(cartes, { q: "helene", niveau: null, teinte: null }).map((c) => c.id), ["a"]);
  assert.deepEqual(filtrerCartes(cartes, { q: "", niveau: "N2", teinte: null }).map((c) => c.id), ["b", "c"]);
  assert.deepEqual(filtrerCartes(cartes, { q: "", niveau: null, teinte: "rouge" }).map((c) => c.id), ["b"]);
  assert.deepEqual(trierCartes(cartes).map((c: CarteEleve) => c.id), ["b", "c", "a"]);
  const n = compterTeintes(cartes);
  assert.equal(n.rouge + n.vert + n.jamais, 3);
  assert.deepEqual(lireFiltresClasse({ q: "x", niveau: "N4", teinte: "bleu" }), { q: "x", niveau: null, teinte: null });
  assert.deepEqual(lireFiltresClasse({ niveau: "N3", teinte: "jaune" }), { q: "", niveau: "N3", teinte: "jaune" });
});

test("espace de commande : chaque action est branchée sur un outil existant", () => {
  const parCle = new Map(COMMANDES.map((c) => [c.cle, c]));
  assert.ok(COMMANDES.every((c) => c.etat === "branche"));
  assert.equal(parCle.get("email")?.href, undefined);
  assert.equal(parCle.get("programmer_live")?.href, "/admin/lives/nouveau");
  assert.equal(parCle.get("passer_live")?.href, "/formateur/sessions#direct");
  assert.equal(parCle.get("annonce")?.href, "/formateur/annonces");
  assert.equal(parCle.get("message")?.etat, "branche");
});

test("brouillons : prénom, cours, liens qui OUVRENT l'application de l'enseignante", () => {
  assert.equal(prenom("Amina Benali (fictive)"), "Amina");
  const m = modeleMessage("Amina Benali", "relancer", "Niveau 1");
  assert.match(m.corps, /^Bonjour Amina,/);
  assert.match(m.corps, /« Niveau 1 »/);
  const mail = lienMailto("amina@exemple.test", "Sujet", "Bonjour\nà vous");
  assert.equal(mail, "mailto:amina@exemple.test?subject=Sujet&body=Bonjour%0A%C3%A0%20vous");
  assert.equal(lienMailto("pas-une-adresse", "s", "c"), null);
  assert.equal(lienMailto(null, "s", "c"), null);
  assert.equal(lienWhatsApp("+213 555 12 34 56", "Salut"), "https://wa.me/213555123456?text=Salut");
  assert.equal(lienWhatsApp(null, "Salut"), null);
});

// Seul fichier autorisé à envoyer : l'action e-mail de l'espace de commande (confirmation + configuration vérifiées avant).
const ENVOI_AUTORISE = "commande-actions.ts";
// Seul fichier autorisé à faire un appel réseau : le client du Centre d'annonces existant.
const RESEAU_AUTORISE = "annonce-api.ts";

test("garde-fou : l'action e-mail vérifie confirmation, configuration et limite AVANT tout envoi", () => {
  const code = readFileSync(join(process.cwd(), "src", "app", "admin", "classe", ENVOI_AUTORISE), "utf8");
  const envoi = code.indexOf("await sendEmail(");
  assert.ok(envoi > 0, "appel d'envoi introuvable");
  for (const garde of ["entree.confirmation !== true", "emailConfigure(process.env.RESEND_API_KEY)", "LIMITE_EMAILS", "dejaEnvoye"]) {
    const i = code.indexOf(garde);
    assert.ok(i > 0 && i < envoi, `garde « ${garde} » absente ou placée après l'envoi`);
  }
});

test("garde-fou : la cloche vérifie confirmation, message et heure AVANT de créer ou d'envoyer", () => {
  const code = readFileSync(join(process.cwd(), "src", "app", "admin", "classe", "cloche-actions.ts"), "utf8");
  const debut = code.indexOf("export async function creerClocheAction");
  const corps = code.slice(debut);
  const creation = corps.indexOf("await creerCloche(");
  const envoi = corps.indexOf("await sonnerCloche(");
  assert.ok(creation > 0 && envoi > creation, "création puis envoi introuvables");
  for (const garde of ["entree.confirmation !== true", "validerMessageCloche(", "lireQuand(", "etatMigrationCloches(", "elevesVisees("]) {
    const i = corps.indexOf(garde);
    assert.ok(i > 0 && i < creation, `garde « ${garde} » absente ou placée après la création`);
  }
});

test("garde-fou : « Ma classe » n'importe aucun module d'envoi et n'écrit rien en base", () => {
  const racine = process.cwd();
  const dossiers = [join(racine, "src", "lib", "classe"), join(racine, "src", "app", "admin", "classe")];
  const fichiers = (d: string): string[] => readdirSync(d).flatMap((n) => {
    const c = join(d, n);
    if (statSync(c).isDirectory()) return fichiers(c);
    return /\.(ts|tsx)$/.test(n) && !/\.test\.ts$/.test(n) ? [c] : [];
  });
  const sources = dossiers.flatMap(fichiers);
  assert.ok(sources.length >= 8, "fichiers de « Ma classe » non trouvés");
  for (const f of sources.filter((x) => !x.endsWith(ENVOI_AUTORISE))) {
    const code = readFileSync(f, "utf8");
    const nom = relative(racine, f);
    if (f.endsWith(RESEAU_AUTORISE)) {
      // Seul appel réseau : le Centre d'annonces existant (qui revérifie tout côté serveur).
      assert.match(code, /fetch\(ROUTE_ANNONCES,/);
      assert.equal((code.match(/fetch\s*\(/g) ?? []).length, 1, `${nom} : un seul appel réseau attendu`);
      assert.match(code, /ROUTE_ANNONCES = "\/api\/announcements\/send"/);
      continue;
    }
    assert.doesNotMatch(code, /from\s+["']@\/lib\/(email|email-templates|push|whatsapp-server|admin-notify|resend)["']/, `${nom} : import d'un module d'envoi`);
    assert.doesNotMatch(code, /\b(sendEmail|sendChatMessage|sendMessageCore|sendPushToUsers)\s*\(/, `${nom} : appel d'envoi`);
    assert.doesNotMatch(code, /\.(insert|upsert|update|delete)\s*\(/, `${nom} : écriture en base`);
    assert.doesNotMatch(code, /fetch\s*\(/, `${nom} : appel réseau direct`);
  }
});
