import { test } from "node:test";
import assert from "node:assert/strict";
import { ilYa, lireLegende, ordreBarre, regrouper, verifierDureeStory, verifierPhotoStory, type StoryVue } from "./regles";

const M = new Date("2026-10-16T12:00:00Z");
const s = (id: string, userId: string, createdAt: string): StoryVue => ({ id, userId, nom: "x", avatar: null, kind: "image", mediaUrl: "u", bunnyVideoId: null, thumbnail: null, duree: null, legende: null, createdAt, calques: [], fond: null, equipe: false });

test("photo : types et poids acceptés", () => {
  assert.equal(verifierPhotoStory({ type: "image/jpeg", size: 200_000 }), null);
  assert.match(verifierPhotoStory({ type: "image/gif", size: 200_000 }) ?? "", /Choisissez une photo/);
  assert.match(verifierPhotoStory({ type: "image/png", size: 9 * 1024 * 1024 }) ?? "", /trop lourde/);
});

test("vidéo : 30 secondes au plus", () => {
  assert.deepEqual(verifierDureeStory(29.6), { ok: true, duree: 30 });
  assert.equal(verifierDureeStory(31).ok, false);
  assert.equal(verifierDureeStory(0).ok, false);
  assert.equal(verifierDureeStory("12").ok, false);
});

test("légende : 150 caractères, espaces normalisés, vide = rien", () => {
  assert.equal(lireLegende("  Ma   robe  "), "Ma robe");
  assert.equal(lireLegende("   "), null);
  assert.equal(lireLegende("a".repeat(300))?.length, 150);
});

test("regroupement : par personne, dans l'ordre, sans les stories de plus de 24 h", () => {
  const g = regrouper([s("b", "u1", "2026-10-16T10:00:00Z"), s("a", "u1", "2026-10-16T08:00:00Z"), s("c", "u2", "2026-10-15T11:00:00Z"), s("d", "u2", "2026-10-15T13:00:00Z")], M);
  assert.deepEqual([...g.keys()].sort(), ["u1", "u2"]);
  assert.deepEqual(g.get("u1")?.map((x) => x.id), ["a", "b"]);
  assert.deepEqual(g.get("u2")?.map((x) => x.id), ["d"]); // « c » a plus de 24 h
  assert.equal(ilYa("2026-10-16T11:48:00Z", M), "il y a 12 min");
  assert.equal(ilYa("2026-10-16T09:00:00Z", M), "il y a 3 h");
});

test("barre : l'enseignante toujours en premier, puis l'équipe, moi, puis les autres (non vues d'abord)", () => {
  const eq = (x: StoryVue) => ({ ...x, equipe: true });
  const g = new Map<string, StoryVue[]>([
    ["autre1", [s("a1", "autre1", "2026-10-16T11:00:00Z")]],
    ["autre2", [s("a2", "autre2", "2026-10-16T09:00:00Z")]],
    ["admin", [eq(s("ad", "admin", "2026-10-16T11:30:00Z"))]],
    ["prof", [eq(s("p", "prof", "2026-10-16T06:00:00Z"))]],
  ]);
  const ids = [...g.keys(), "moi"];
  // Élève : sa prof, le reste de l'équipe, « Ma story », puis les autres ; « autre1 » déjà vue passe après « autre2 ».
  assert.deepEqual(ordreBarre(ids, g, { meId: "moi", moiEquipe: false, enseignantes: ["prof"], vues: new Set(["a1"]) }), ["prof", "admin", "moi", "autre2", "autre1"]);
  // Sans rien de vu : la plus récente d'abord.
  assert.deepEqual(ordreBarre(ids, g, { meId: "moi", moiEquipe: false, enseignantes: ["prof"], vues: new Set() }).slice(3), ["autre1", "autre2"]);
  // Enseignante qui regarde : sa story d'abord.
  assert.deepEqual(ordreBarre(ids, g, { meId: "moi", moiEquipe: true, enseignantes: [], vues: new Set() }).slice(0, 3), ["moi", "admin", "prof"]);
});
