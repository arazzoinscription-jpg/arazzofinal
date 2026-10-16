import { test } from "node:test";
import assert from "node:assert/strict";
import { apercuPiece, dureeLisible, dureePiece, extensionPour, typeDeBase, verifierPiece } from "./messagerie-pieces";

test("pièce : photo acceptée, autres fichiers refusés", () => {
  assert.equal(verifierPiece({ kind: "image", type: "image/jpeg", size: 300_000 }), null);
  assert.match(verifierPiece({ kind: "image", type: "application/pdf", size: 300_000 }) ?? "", /Choisissez une photo/);
  assert.match(verifierPiece({ kind: "image", type: "image/png", size: 9 * 1024 * 1024 }) ?? "", /trop lourde/);
  assert.match(verifierPiece({ kind: "document", type: "application/pdf", size: 300_000 }) ?? "", /inconnue/);
});

test("pièce : vocal de 2 minutes au plus, formats des téléphones (webm Android, mp4 iPhone)", () => {
  assert.equal(verifierPiece({ kind: "audio", type: "audio/webm;codecs=opus", size: 50_000, duree: 12 }), null);
  assert.equal(verifierPiece({ kind: "audio", type: "audio/mp4", size: 50_000, duree: 119 }), null);
  assert.match(verifierPiece({ kind: "audio", type: "audio/mp4", size: 50_000, duree: 200 }) ?? "", /2 minutes/);
  assert.match(verifierPiece({ kind: "audio", type: "audio/webm", size: 50_000, duree: 0 }) ?? "", /trop court/);
  assert.match(verifierPiece({ kind: "audio", type: "audio/flac", size: 50_000, duree: 5 }) ?? "", /Format audio/);
  assert.equal(typeDeBase("audio/webm;codecs=opus"), "audio/webm");
  assert.equal(extensionPour("audio", "audio/mp4"), "m4a");
  assert.equal(extensionPour("image", "image/jpeg"), "jpg");
});

test("aperçu et durée", () => {
  assert.equal(apercuPiece("image"), "📷 Photo");
  assert.equal(apercuPiece("audio", 75), "🎤 Message vocal (1:15)");
  assert.equal(apercuPiece(null), "");
  assert.equal(dureeLisible(42), "0:42");
  assert.equal(dureePiece("audio", 300), 120);
  assert.equal(dureePiece("audio", 0.4), 1);
  assert.equal(dureePiece("image", 10), null);
});

test("vidéo ronde : 1 minute au plus (webm Android, mp4 iPhone)", () => {
  assert.equal(verifierPiece({ kind: "video", type: "video/webm;codecs=vp8,opus", size: 2_000_000, duree: 45 }), null);
  assert.equal(verifierPiece({ kind: "video", type: "video/mp4", size: 3_000_000, duree: 60 }), null);
  assert.match(verifierPiece({ kind: "video", type: "video/mp4", size: 3_000_000, duree: 90 }) ?? "", /1 minute/);
  assert.match(verifierPiece({ kind: "video", type: "video/x-msvideo", size: 3_000_000, duree: 10 }) ?? "", /Format vidéo/);
  assert.equal(dureePiece("video", 75), 60);
  assert.equal(apercuPiece("video", 42), "🎥 Vidéo (0:42)");
});
