import { test } from "node:test";
import assert from "node:assert/strict";
import { aDuSon, niveauxDb, pisteAudioPresente } from "./son-video";

const RATE = 44100;
/** Un signal de `secondes` : sinus d'amplitude `amp` pendant la part `actif` de chaque seconde, bruit léger sinon. */
function signal(secondes: number, amp: number, actif: number, bruit = 0.002): Float32Array {
  const s = new Float32Array(RATE * secondes);
  for (let i = 0; i < s.length; i++) {
    const t = (i % RATE) / RATE;
    const fond = (Math.random() * 2 - 1) * bruit;
    s[i] = t < actif ? amp * Math.sin((2 * Math.PI * 220 * i) / RATE) + fond : fond;
  }
  return s;
}

test("niveaux : silence complet = −120 dB ; un sinus d'amplitude 0,1 ≈ −23 dB", () => {
  assert.ok(niveauxDb(new Float32Array(4096)).every((db) => db === -120));
  const n = niveauxDb(signal(1, 0.1, 1, 0));
  assert.ok(n.every((db) => db > -24 && db < -22), String(n[0]));
});

test("muette ou bruit de fond → pas de son propre (musique automatique)", () => {
  assert.equal(aDuSon(niveauxDb(new Float32Array(RATE * 3))), false);
  assert.equal(aDuSon(niveauxDb(signal(3, 0, 0, 0.003))), false, "bruit de fond ≈ −55 dB");
  assert.equal(aDuSon(niveauxDb(signal(3, 0.1, 0.1))), false, "un petit bruit (10 % du temps)");
  assert.equal(aDuSon([]), false);
});

test("parole (avec des pauses) ou musique continue → son propre (pas de musique ajoutée)", () => {
  assert.equal(aDuSon(niveauxDb(signal(3, 0.1, 1))), true, "musique continue");
  assert.equal(aDuSon(niveauxDb(signal(3, 0.08, 0.5))), true, "parole : la moitié du temps");
  assert.equal(aDuSon(niveauxDb(signal(3, 0.05, 0.35))), true, "voix plus basse, 35 % du temps");
});

test("piste audio : MP4 / MOV (« hdlr … soun »), WebM (codec audio), autre format = on ne sait pas", () => {
  const octets = (...morceaux: (string | number[])[]) => new Uint8Array(morceaux.flatMap((m) => (typeof m === "string" ? Array.from(m, (c) => c.charCodeAt(0)) : m)));
  const z = (n: number) => new Array(n).fill(0);
  assert.equal(pisteAudioPresente(octets(z(4), "ftypisom", z(40), "hdlr", z(8), "vide", z(20), "hdlr", z(8), "soun")), true);
  assert.equal(pisteAudioPresente(octets(z(4), "ftypisom", z(40), "hdlr", z(8), "vide", z(20))), false, "vidéo seule : muette");
  assert.equal(pisteAudioPresente(octets([0x1a, 0x45, 0xdf, 0xa3], z(30), "V_VP8", z(10), "A_OPUS")), true);
  assert.equal(pisteAudioPresente(octets([0x1a, 0x45, 0xdf, 0xa3], z(30), "V_VP8", z(10))), false);
  assert.equal(pisteAudioPresente(octets("RIFF", z(40))), null);
});
