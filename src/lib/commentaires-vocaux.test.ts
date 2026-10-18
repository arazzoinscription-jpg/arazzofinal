import { test } from "node:test";
import assert from "node:assert/strict";
import { COMMENTAIRE_VOCAL_MAX_S, verifierCommentaireVocal } from "./commentaires-vocaux";

test("commentaire vocal : formats du téléphone acceptés, 1 minute au plus (une durée trop longue est ramenée à 60 s)", () => {
  assert.deepEqual(verifierCommentaireVocal({ type: "audio/webm;codecs=opus", size: 40_000, duree: 12.4 }), { ok: true, extension: "webm", duree: 12 });
  assert.deepEqual(verifierCommentaireVocal({ type: "audio/mp4", size: 40_000, duree: "75" }), { ok: true, extension: "m4a", duree: COMMENTAIRE_VOCAL_MAX_S });
});

test("commentaire vocal refusé : format inconnu, vide, trop lourd, sans durée", () => {
  assert.equal(verifierCommentaireVocal({ type: "video/mp4", size: 40_000, duree: 5 }).ok, false);
  assert.equal(verifierCommentaireVocal({ type: "audio/webm", size: 10, duree: 5 }).ok, false);
  assert.equal(verifierCommentaireVocal({ type: "audio/webm", size: 10 * 1024 * 1024, duree: 5 }).ok, false);
  assert.equal(verifierCommentaireVocal({ type: "audio/webm", size: 40_000, duree: 0 }).ok, false);
  assert.equal(verifierCommentaireVocal({ type: "audio/webm", size: 40_000, duree: undefined }).ok, false);
});
