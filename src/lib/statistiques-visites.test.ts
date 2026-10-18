import { test } from "node:test";
import assert from "node:assert/strict";
import { compterVisites, enCeMoment, ilYa, libellePage, lirePeriode, quiEstVenu, type Visite } from "./statistiques-visites";

const T0 = Date.UTC(2026, 9, 18, 10, 0, 0);
const a = (min: number) => new Date(T0 + min * 60_000).toISOString();
const v = (p: Partial<Visite> & { path: string; min: number }): Visite => ({
  source: "internal", session_id: null, user_id: null, duration_sec: 0, device: "mobile", ...p, created_at: a(p.min),
});

test("pages lisibles : La Cour, tableau de bord, cours, accueil, inconnue", () => {
  assert.equal(libellePage("/"), "Accueil");
  assert.equal(libellePage("/communaute"), "La Cour (feed)");
  assert.equal(libellePage("/communaute/u/123"), "La Cour · un profil");
  assert.equal(libellePage("/dashboard/patrons"), "Tableau de bord · patrons");
  assert.equal(libellePage("/dashboard/aaaaaaaa-0000-0000-0000-000000000001"), "Tableau de bord");
  assert.equal(libellePage("/cours/abc/lecon/2"), "Un cours (leçon)");
  assert.equal(libellePage("/free/robe-portefeuille"), "Cours gratuit · robe portefeuille");
  assert.equal(libellePage("/autre-chose"), "/autre-chose");
});

test("période : 7 jours par défaut", () => {
  assert.equal(lirePeriode("1"), 1);
  assert.equal(lirePeriode("30"), 30);
  assert.equal(lirePeriode(undefined), 7);
  assert.equal(lirePeriode("999"), 7);
});

test("« il y a » : minutes, heures, jours", () => {
  assert.equal(ilYa(a(0), T0 + 20_000), "à l'instant");
  assert.equal(ilYa(a(0), T0 + 5 * 60_000), "il y a 5 min");
  assert.equal(ilYa(a(0), T0 + 3 * 3_600_000), "il y a 3 h");
  assert.equal(ilYa(a(0), T0 + 2 * 86_400_000), "il y a 2 j");
});

test("visites : 30 min de pause = nouvelle visite", () => {
  assert.equal(compterVisites([]), 0);
  assert.equal(compterVisites([0, 10 * 60_000, 25 * 60_000]), 1);
  assert.equal(compterVisites([0, 10 * 60_000, 50 * 60_000]), 2);
});

test("qui est venu : la personne connectée, ses visites d'avant la connexion, La Cour, l'équipe exclue", () => {
  const rows: Visite[] = [
    // Amina arrive de Facebook sans être connectée, regarde La Cour, se connecte.
    v({ path: "/communaute", min: 0, source: "facebook", session_id: "nav-amina", duration_sec: 120 }),
    v({ path: "/login", min: 2, session_id: "nav-amina" }),
    v({ path: "/dashboard", min: 3, session_id: "nav-amina", user_id: "amina", duration_sec: 30 }),
    // Elle revient 2 h plus tard dans La Cour.
    v({ path: "/communaute", min: 120, session_id: "nav-amina", user_id: "amina", duration_sec: 60, device: "desktop" }),
    // Un visiteur sans compte (Google), deux pages dont La Cour.
    v({ path: "/", min: 5, source: "google", session_id: "nav-x" }),
    v({ path: "/communaute", min: 6, session_id: "nav-x" }),
    // L'admin ne compte pas.
    v({ path: "/communaute", min: 7, session_id: "nav-admin", user_id: "admin" }),
    // Ordinateur partagé : deux comptes → la page anonyme n'est rattachée à personne.
    v({ path: "/", min: 8, session_id: "nav-partage" }),
    v({ path: "/dashboard", min: 9, session_id: "nav-partage", user_id: "sara" }),
    v({ path: "/dashboard", min: 10, session_id: "nav-partage", user_id: "lina" }),
  ];
  const { personnes, anonymes } = quiEstVenu(rows, { depuis: T0 - 1, exclure: new Set(["admin"]) });

  assert.deepEqual(personnes.map((p) => p.userId), ["amina", "lina", "sara"]);
  const amina = personnes[0];
  assert.equal(amina.vues, 4);
  assert.equal(amina.visites, 2);
  assert.equal(amina.tempsSec, 210);
  assert.equal(amina.source, "facebook");
  assert.equal(amina.appareil, "desktop");
  assert.equal(amina.vuesCour, 2);
  assert.equal(amina.visitesCour, 2);
  assert.equal(amina.tempsCourSec, 180);
  assert.equal(amina.derniereCour, a(120));
  assert.equal(amina.dernierePage, "/communaute");

  assert.equal(anonymes.visiteurs, 2); // nav-x + la page anonyme de l'ordinateur partagé
  assert.equal(anonymes.vues, 3);
  assert.equal(anonymes.visiteursCour, 1);
  assert.equal(anonymes.vuesCour, 1);
  assert.deepEqual(anonymes.sources, [{ source: "google", n: 1 }, { source: "direct", n: 1 }]);
});

test("période : les pages vues avant sont ignorées, mais servent à reconnaître le navigateur", () => {
  const rows: Visite[] = [
    v({ path: "/dashboard", min: 0, session_id: "nav-amina", user_id: "amina" }),
    v({ path: "/communaute", min: 3000, session_id: "nav-amina" }), // revenue sans être connectée
  ];
  const { personnes, anonymes } = quiEstVenu(rows, { depuis: T0 + 2000 * 60_000 });
  assert.equal(personnes.length, 1);
  assert.equal(personnes[0].vues, 1);
  assert.equal(personnes[0].vuesCour, 1);
  assert.equal(anonymes.visiteurs, 0);
});

test("en ce moment : 10 dernières minutes, et qui est dans La Cour", () => {
  const rows: Visite[] = [
    v({ path: "/communaute", min: 0, session_id: "s1", user_id: "amina" }),
    v({ path: "/dashboard", min: 55, session_id: "s2", user_id: "sara" }),
    v({ path: "/communaute", min: 56, session_id: "s3" }),
    v({ path: "/communaute", min: 57, session_id: "s4", user_id: "lina" }),
  ];
  const r = enCeMoment(rows, { maintenant: T0 + 60 * 60_000 });
  assert.deepEqual(r.personnes.sort(), ["lina", "sara"]);
  assert.deepEqual(r.personnesCour, ["lina"]);
  assert.equal(r.anonymes, 1);
  assert.equal(r.anonymesCour, 1);
});
