import { test } from "node:test";
import assert from "node:assert/strict";
import { filtrerAnnuaire, fusionnerCoursGratuits, lirePeriodeAnnuaire, pageDe, telephoneInternational } from "./annuaire";

const snap = (slug: string, data: Record<string, unknown> | null) => ({ slug, data });

test("cours gratuits : seulement les siens (plus récent en haut, 1re inscription retenue), jamais les autres cours en ligne", () => {
  const leads = [
    { slug: "robe-dinterieur", created_at: "2026-10-10T09:00:00Z" },
    { slug: "feed", created_at: "2026-10-15T09:00:00Z" },
    { slug: "robe-dinterieur", created_at: "2026-10-12T09:00:00Z" }, // 2e inscription au même cours
  ];
  const instantanes = [
    snap("robe-dinterieur", { active: true, title: "Robe d'intérieur", cover_image_url: "https://x/robe.jpg" }),
    snap("feed", { active: true, title: "Créations des élèves", cover_video_url: "https://youtu.be/abcdefghijk" }),
    snap("jupe", { active: true, title: "Jupe simple" }),
    snap("ancien", { active: false, status: "moved", moved_to: "jupe" }),
    snap("ferme", { active: false, title: "Cours fermé" }),
  ];
  const siens = fusionnerCoursGratuits(leads, instantanes);
  // « jupe » est en ligne mais elle n'a pas rempli son formulaire : ce cadeau n'apparaît pas dans son compte.
  assert.deepEqual(siens.map((c) => [c.slug, c.inscriteLe]), [["feed", "2026-10-15T09:00:00Z"], ["robe-dinterieur", "2026-10-10T09:00:00Z"]]);
  assert.equal(siens[0].couverture, "https://img.youtube.com/vi/abcdefghijk/hqdefault.jpg");
  assert.equal(siens[1].couverture, "https://x/robe.jpg");
  assert.equal(siens[1].lien, "/free/robe-dinterieur?acces=1");
  assert.deepEqual(fusionnerCoursGratuits([], instantanes), [], "un compte sans formulaire rempli n'a aucun cours gratuit");
});

test("cours gratuit dont la page a disparu : gardé pour l'équipe (titre tiré de l'adresse), marqué hors ligne", () => {
  const [c] = fusionnerCoursGratuits([{ slug: "robe-katifa", created_at: "2026-09-01T00:00:00Z" }], []);
  assert.equal(c.titre, "robe katifa");
  assert.equal(c.enLigne, false);
});

test("téléphone algérien → format international (WhatsApp, appel)", () => {
  assert.equal(telephoneInternational("0555 12 34 56"), "213555123456");
  assert.equal(telephoneInternational("+213 555 12 34 56"), "213555123456");
  assert.equal(telephoneInternational("00213555123456"), "213555123456");
  assert.equal(telephoneInternational("555123456"), "213555123456");
  assert.equal(telephoneInternational("+33 6 12 34 56 78"), "33612345678");
  assert.equal(telephoneInternational(""), null);
  assert.equal(telephoneInternational(null), null);
});

test("annuaire : recherche sans accents, période de création, plus récentes d'abord, pages", () => {
  const maintenant = Date.parse("2026-10-19T12:00:00Z");
  const liste = [
    { id: "1", nom: "Amina Bélkacem", email: "amina@x.dz", ville: "Sétif", created_at: "2026-10-19T08:00:00Z" },
    { id: "2", nom: "Sara", email: "sara@x.dz", ville: "Alger", created_at: "2026-10-10T08:00:00Z" },
    { id: "3", nom: "Lina", email: "lina@x.dz", ville: null, created_at: "2026-08-01T08:00:00Z" },
  ];
  assert.deepEqual(filtrerAnnuaire(liste, { maintenant }).map((v) => v.id), ["1", "2", "3"]);
  assert.deepEqual(filtrerAnnuaire(liste, { q: "belkacem setif", maintenant }).map((v) => v.id), ["1"]);
  assert.deepEqual(filtrerAnnuaire(liste, { q: "SARA@", maintenant }).map((v) => v.id), ["2"]);
  assert.deepEqual(filtrerAnnuaire(liste, { periode: "1", maintenant }).map((v) => v.id), ["1"]);
  assert.deepEqual(filtrerAnnuaire(liste, { periode: "30", maintenant }).map((v) => v.id), ["1", "2"]);
  assert.equal(lirePeriodeAnnuaire("7"), "7");
  assert.equal(lirePeriodeAnnuaire("x"), "tout");

  const cent = Array.from({ length: 120 }, (_, i) => i);
  assert.deepEqual(pageDe(cent, "2").lignes.slice(0, 2), [50, 51]);
  assert.equal(pageDe(cent, "2").pages, 3);
  assert.equal(pageDe(cent, "99").page, 3);
  assert.equal(pageDe(cent, "abc").page, 1);
  assert.deepEqual(pageDe([], "1"), { lignes: [], page: 1, pages: 1 });
});
