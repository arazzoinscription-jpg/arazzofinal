import { test } from "node:test";
import assert from "node:assert/strict";
import { adresseReglages, codeErreur, detecterContexte, etapesAutorisation, lienOuvrirChrome, messageEchec, navigateurIntegre, raisonEchec } from "./autorisations-media";

const UA = {
  androidChrome: "Mozilla/5.0 (Linux; Android 13; SM-A135F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
  samsung: "Mozilla/5.0 (Linux; Android 13; SM-A135F) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/23.0 Chrome/115.0.0.0 Mobile Safari/537.36",
  iphoneSafari: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  iphoneChrome: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/120.0 Mobile/15E148 Safari/604.1",
  pcChrome: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  pcEdge: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0",
  pcFirefox: "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
  macSafari: "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
};

test("appareil et navigateur reconnus (Samsung et Edge avant Chrome, Chrome iPhone = CriOS)", () => {
  assert.deepEqual(detecterContexte(UA.androidChrome), { appareil: "android", navigateur: "chrome", installee: false, integre: null });
  assert.equal(detecterContexte(UA.samsung).navigateur, "samsung");
  assert.deepEqual(detecterContexte(UA.iphoneSafari, true), { appareil: "iphone", navigateur: "safari", installee: true, integre: null });
  assert.equal(detecterContexte(UA.iphoneChrome).navigateur, "chrome");
  assert.equal(detecterContexte(UA.pcEdge).navigateur, "edge");
  assert.equal(detecterContexte(UA.pcFirefox).navigateur, "firefox");
  assert.deepEqual(detecterContexte(UA.macSafari), { appareil: "pc", navigateur: "safari", installee: false, integre: null });
  assert.equal(detecterContexte("").appareil, "pc");
});

test("étapes : propres à chaque appareil, toujours avec « Réessayer » à la fin du chemin", () => {
  const android = etapesAutorisation(detecterContexte(UA.androidChrome), "camera");
  assert.match(android.join(" "), /cadenas[\s\S]*Autorisations[\s\S]*« Caméra » et « Micro »[\s\S]*Réessayer/);
  assert.match(etapesAutorisation(detecterContexte(UA.androidChrome, true), "micro").join(" "), /Paramètres du téléphone[\s\S]*Chrome › Autorisations[\s\S]*« Micro »/);
  assert.match(etapesAutorisation(detecterContexte(UA.samsung, true), "micro").join(" "), /Samsung Internet/);
  assert.match(etapesAutorisation(detecterContexte(UA.iphoneSafari), "micro").join(" "), /« aA »[\s\S]*Réglages du site web[\s\S]*« Micro »/);
  assert.match(etapesAutorisation(detecterContexte(UA.iphoneSafari, true), "camera").join(" "), /Réglages de l’iPhone[\s\S]*Safari[\s\S]*Caméra » et « Microphone/);
  assert.match(etapesAutorisation(detecterContexte(UA.iphoneChrome), "camera").join(" "), /« Chrome »[\s\S]*« Caméra » et « Micro »/);
  assert.match(etapesAutorisation(detecterContexte(UA.pcChrome), "camera").join(" "), /cadenas[\s\S]*F5[\s\S]*Windows/);
  assert.match(etapesAutorisation(detecterContexte(UA.pcFirefox), "micro").join(" "), /Bloqué temporairement/);
  for (const ua of Object.values(UA)) {
    for (const b of ["micro", "camera"] as const) assert.ok(etapesAutorisation(detecterContexte(ua), b).some((e) => /Réessayer/.test(e)), `${ua.slice(0, 30)} ${b}`);
  }
});

test("adresse des réglages du site : Chrome et Edge sur ordinateur seulement", () => {
  assert.equal(adresseReglages(detecterContexte(UA.pcChrome), "https://www.formation-arazzo.store/"), "chrome://settings/content/siteDetails?site=https%3A%2F%2Fwww.formation-arazzo.store");
  assert.match(adresseReglages(detecterContexte(UA.pcEdge), "https://www.formation-arazzo.store") ?? "", /^edge:\/\/settings\/content\/siteDetails\?site=/);
  assert.equal(adresseReglages(detecterContexte(UA.pcFirefox), "https://x"), null);
  assert.equal(adresseReglages(detecterContexte(UA.androidChrome), "https://x"), null);
});

test("raison de l'échec : refus, pas d'appareil, occupé, navigateur", () => {
  assert.equal(raisonEchec("NotAllowedError"), "refuse");
  assert.equal(raisonEchec("NotFoundError"), "absent");
  assert.equal(raisonEchec("NotReadableError"), "occupe");
  assert.equal(raisonEchec("TypeError"), "non_pris_en_charge");
  assert.equal(raisonEchec(undefined), "autre");
  assert.match(messageEchec("occupe", "micro"), /Le micro est utilisé par une autre application/);
  assert.match(messageEchec("absent", "camera"), /Aucune caméra/);
});

test("lien ouvert dans Instagram / Facebook / TikTok : on le reconnaît et on fait ouvrir le vrai navigateur", () => {
  const insta = "Mozilla/5.0 (Linux; Android 13; SM-A135F; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/120.0 Mobile Safari/537.36 Instagram 312.0.0.32.112 Android";
  const fb = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBAV/440.0]";
  assert.equal(navigateurIntegre(insta), "Instagram");
  assert.equal(navigateurIntegre(fb), "Facebook");
  assert.equal(navigateurIntegre(UA.androidChrome), null);
  const c = detecterContexte(insta);
  assert.match(etapesAutorisation(c, "micro").join(" "), /application Instagram[\s\S]*Ouvrir dans Chrome/);
  assert.match(etapesAutorisation(detecterContexte(fb), "camera").join(" "), /Ouvrir dans le navigateur[\s\S]*Safari/);
  assert.equal(lienOuvrirChrome(c, "https://www.formation-arazzo.store/dashboard?x=1"), "intent://www.formation-arazzo.store/dashboard?x=1#Intent;scheme=https;package=com.android.chrome;end");
  assert.equal(lienOuvrirChrome(detecterContexte(UA.androidChrome), "https://x.dz/"), null);
  assert.equal(lienOuvrirChrome(detecterContexte(fb), "https://x.dz/"), null, "iPhone : pas de lien, les étapes");
});

test("code d'erreur lisible pour le diagnostic (nom + message court)", () => {
  assert.equal(codeErreur({ name: "NotAllowedError", message: "Permission denied" }), "NotAllowedError — Permission denied");
  assert.equal(codeErreur({ name: "InvalidStateError", message: "InvalidStateError" }), "InvalidStateError");
  assert.equal(codeErreur(null), "inconnu");
  assert.equal(codeErreur("échec"), "échec");
});
