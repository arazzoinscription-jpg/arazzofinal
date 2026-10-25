import { test } from "node:test";
import assert from "node:assert/strict";
import { aplatirLecons, copieDeLecon, filtrerLecons, miniatureDe, slugDeCours, videoBunny, type CoursBrut } from "./bibliotheque";

const lecon = (id: string, titre: string, ordre: number, video: string | null = null) =>
  ({ id, titre, ordre, video_url_bunny: video, duree_minutes: 12 });

const COURS: CoursBrut[] = [
  { id: "c2", titre_fr: "Modélisme", published: false, ordre: null, chapters: [
    { id: "ch3", titre: "Bases", ordre: 1, lessons: [lecon("l5", "Le buste", 1)] },
  ] },
  { id: "c1", titre_fr: "Couture niveau 1", published: true, ordre: 1, chapters: [
    { id: "ch2", titre: "Chapitre 2", ordre: 2, lessons: [lecon("l3", "La jupe crayon", 1, "https://iframe.mediadelivery.net/embed/111/abc-1")] },
    { id: "ch1", titre: "Chapitre 1", ordre: 1, lessons: [
      lecon("l2", "Coudre une pince", 2),
      lecon("l1", "Prise de mesures", 1, '<div><iframe src="https://iframe.mediadelivery.net/play/111/vid-9?x=1"></iframe></div>'),
    ] },
  ] },
];

test("toutes les leçons dans l'ordre du parcours : cours ordonnés d'abord, puis chapitres, puis leçons", () => {
  const l = aplatirLecons(COURS);
  assert.deepEqual(l.map((x) => x.id), ["l1", "l2", "l3", "l5"]);
  assert.equal(l[0].coursTitre, "Couture niveau 1");
  assert.equal(l[0].chapitre, "Chapitre 1");
  assert.equal(l[1].video, null);
  assert.equal(l[3].coursPublie, false);
});

test("recherche sans accents (leçon, cours ou chapitre), filtre par cours et « avec vidéo »", () => {
  const l = aplatirLecons(COURS);
  assert.deepEqual(filtrerLecons(l, { recherche: "MESURES" }).map((x) => x.id), ["l1"]);
  assert.deepEqual(filtrerLecons(l, { recherche: "modelisme" }).map((x) => x.id), ["l5"]);
  assert.deepEqual(filtrerLecons(l, { recherche: "couture pince" }).map((x) => x.id), ["l2"]);
  assert.deepEqual(filtrerLecons(l, { coursId: "c1", avecVideo: true }).map((x) => x.id), ["l1", "l3"]);
  assert.equal(filtrerLecons(l, {}).length, 4);
});

test("vidéo Bunny reconnue (embed, play, code HTML) ; miniature seulement pour la bibliothèque des cours", () => {
  assert.deepEqual(videoBunny("https://iframe.mediadelivery.net/embed/111/abc-1"), { bibliotheque: "111", id: "abc-1" });
  assert.deepEqual(videoBunny('<iframe src="https://iframe.mediadelivery.net/play/111/vid-9">'), { bibliotheque: "111", id: "vid-9" });
  assert.equal(videoBunny("https://youtu.be/xyz"), null);
  assert.equal(miniatureDe("https://iframe.mediadelivery.net/embed/111/abc-1", "111", "https://vz-1.b-cdn.net/"), "https://vz-1.b-cdn.net/abc-1/thumbnail.jpg");
  assert.equal(miniatureDe("https://iframe.mediadelivery.net/embed/222/abc-1", "111", "https://vz-1.b-cdn.net"), null);
  assert.equal(miniatureDe("https://iframe.mediadelivery.net/embed/111/abc-1", "111", ""), null);
});

test("copie d'une leçon : même titre, même vidéo, nouvelle place, jamais en aperçu gratuit", () => {
  const c = copieDeLecon({ id: "l1", titre: "  Prise de mesures ", video_url_bunny: "https://v", duree_minutes: 8, ordre: 4 }, "chX", 2);
  assert.deepEqual(c, { chapter_id: "chX", titre: "Prise de mesures", video_url_bunny: "https://v", duree_minutes: 8, ordre: 2, is_preview: false });
  assert.equal(copieDeLecon({ id: "x", titre: "", video_url_bunny: " ", duree_minutes: null, ordre: null }, "c", 1).video_url_bunny, null);
});

test("adresse du nouveau cours sans accents", () => {
  assert.equal(slugDeCours("Robe d'été — Niveau 2", "a1b2c3"), "robe-d-ete-niveau-2-a1b2c3");
  assert.equal(slugDeCours("خياطة", "a1b2c3"), "cours-a1b2c3");
});
