import { test } from "node:test";
import assert from "node:assert/strict";
import { emailConfigure, envoyables, etapeFinale, lireCible, resumer, texteVersHtml, validerMessage, type Destinataire } from "./commande";

const U = "11111111-1111-4111-8111-111111111111";

test("cible : seules des formes connues avec un identifiant valide", () => {
  assert.deepEqual(lireCible({ type: "eleve", id: U }), { type: "eleve", id: U });
  assert.deepEqual(lireCible({ type: "niveau", courseId: U }), { type: "niveau", courseId: U });
  assert.deepEqual(lireCible({ type: "groupe", id: U }), { type: "groupe", id: U });
  assert.equal(lireCible({ type: "eleve", id: "x' OR 1=1" }), null);
  assert.equal(lireCible({ type: "tous" }), null);
  assert.equal(lireCible(null), null);
});

test("message : objet et texte bornés", () => {
  assert.equal(validerMessage("Hi", "Bonjour à toutes et à tous").ok, false);
  assert.equal(validerMessage("Rappel", "court").ok, false);
  const ok = validerMessage("  Rappel atelier  ", "  Bonjour, n'oubliez pas samedi.  ");
  assert.deepEqual(ok, { ok: true, sujet: "Rappel atelier", corps: "Bonjour, n'oubliez pas samedi." });
});

test("texte → HTML échappé (aucune balise injectée), retours à la ligne gardés", () => {
  assert.equal(texteVersHtml('<script>x</script>\nLigne "2" & \'3\''), "&lt;script&gt;x&lt;/script&gt;<br/>Ligne &quot;2&quot; &amp; &#39;3&#39;");
});

test("destinataires : adresse manquante, désinscription, envoyables — jamais d'adresse dans l'aperçu", () => {
  const ds: Destinataire[] = [
    { id: "a", nom: "Amina Benali", email: "amina@exemple.test", emailAutorise: true },
    { id: "b", nom: "Basma", email: "basma@exemple.test", emailAutorise: null },
    { id: "c", nom: "Chahra", email: "chahra@exemple.test", emailAutorise: false },
    { id: "d", nom: "Dounia", email: null, emailAutorise: true },
    { id: "e", nom: "Fella", email: "pas-une-adresse", emailAutorise: true },
  ];
  assert.deepEqual(envoyables(ds).map((d) => d.id), ["a", "b"]);
  const r = resumer(ds);
  assert.deepEqual({ total: r.total, envoyables: r.envoyables, desinscrites: r.desinscrites, sansEmail: r.sansEmail }, { total: 5, envoyables: 2, desinscrites: 1, sansEmail: 2 });
  assert.ok(!r.apercuNoms.join(" ").includes("@"));
});

test("service e-mail : la clé de construction factice n'est pas une configuration", () => {
  assert.equal(emailConfigure(undefined), false);
  assert.equal(emailConfigure(""), false);
  assert.equal(emailConfigure("re_placeholder_build_key"), false);
  assert.equal(emailConfigure("re_1234567890abcdef"), true);
});

test("étape finale : seulement ce que le service a confirmé", () => {
  assert.equal(etapeFinale({ tentes: 0, envoyes: 0, echecs: 0 }), "bloque");
  assert.equal(etapeFinale({ tentes: 3, envoyes: 3, echecs: 0 }), "confirme");
  assert.equal(etapeFinale({ tentes: 3, envoyes: 1, echecs: 2 }), "partiel");
  assert.equal(etapeFinale({ tentes: 2, envoyes: 0, echecs: 2 }), "echec");
});
