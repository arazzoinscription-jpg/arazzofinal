"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Autorisation de publication sur les réseaux sociaux.
 *
 * Cette case est le seul endroit où une étudiante décide si l'école peut
 * montrer son prénom, sa photo et ses travaux à l'extérieur. Trois principes
 * la gouvernent, et ils sont dans le code plutôt que dans une note :
 *
 *   - Elle est DÉCOCHÉE par défaut. Une case pré-cochée n'est pas un accord.
 *   - Chaque décision AJOUTE une ligne, elle n'en remplace aucune. L'historique
 *     est une preuve, dans les deux sens.
 *   - Le texte accepté est copié avec la décision. Reformuler la demande plus
 *     tard ne changera pas ce que les autres ont accepté.
 */

/* ────────────────────────────────────────────────────────────────────────────
 * ⚠️  CE TEXTE VOUS APPARTIENT — RELISEZ-LE AVANT LA MISE EN LIGNE.
 *
 * Ce brouillon décrit fidèlement ce que le système fait, ce que je peux
 * garantir. Les mots, eux, sont ceux de votre école : ajustez le ton, le
 * vouvoiement, les plateformes que vous visez vraiment.
 *
 * Ne le raccourcissez pas en « j'autorise Arazzo à utiliser mes données » :
 * un accord trop vague ne vaut rien, ni moralement ni juridiquement.
 * ──────────────────────────────────────────────────────────────────────────── */
const CONSENT_TEXT = `J'autorise Arazzo Formation à publier, sur ses comptes Instagram et Facebook et sur son site, mon prénom, ma photo de profil, les photos et vidéos de mes travaux pratiques, ainsi que les commentaires que ma formatrice a écrits à leur sujet.

Ces publications servent à faire connaître la formation et à donner envie à d'autres femmes de s'y inscrire.

Je peux refuser sans que cela change quoi que ce soit à ma formation, à mon suivi ou à mes résultats. Je peux revenir sur cette autorisation à tout moment depuis cette page : les publications déjà en ligne ne disparaîtront pas d'elles-mêmes, mais plus aucune nouvelle ne sera faite, et celles qui étaient programmées seront annulées.`;

/** Ce que l'accord couvre. Enregistré avec la décision, pour rester vérifiable. */
const SCOPE = ["prenom", "photo_profil", "photos_travaux", "commentaires_formatrice"];

type Etat = {
  granted: boolean;
  decided_at: string;
} | null;

export function PublicationConsent({ userId, initial }: { userId: string; initial: Etat }) {
  const supabase = createClient();
  const [etat, setEtat] = useState<Etat>(initial);
  const [coche, setCoche] = useState(initial?.granted ?? false);
  const [envoi, setEnvoi] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const dejaDecide = etat !== null;
  const change = coche !== (etat?.granted ?? false);

  async function enregistrer() {
    setEnvoi(true);
    setMsg(null);

    // INSERT, jamais UPDATE : chaque décision est une ligne de plus.
    const { error } = await supabase.from("publication_consents").insert({
      user_id: userId,
      granted: coche,
      consent_text: CONSENT_TEXT,
      scope: SCOPE,
      source: "profil",
    });

    setEnvoi(false);
    if (error) {
      setMsg({ ok: false, text: "Erreur : " + error.message });
      return;
    }
    setEtat({ granted: coche, decided_at: new Date().toISOString() });
    setMsg({
      ok: true,
      text: coche
        ? "Autorisation enregistrée ✓ Merci."
        : "Autorisation retirée ✓ Plus aucune nouvelle publication ne vous concernera.",
    });
  }

  return (
    <div className="bg-white rounded-2xl border border-cream-200 shadow-soft p-7">
      <h2 className="font-playfair text-xl font-bold text-gray-900 mb-1">
        Vos travaux sur les réseaux sociaux
      </h2>
      <p className="text-sm text-gray-500 font-dm mb-5">
        Votre choix, et vous pouvez en changer quand vous voulez.
      </p>

      <div className="rounded-xl bg-cream-50 border border-cream-200 p-5 mb-5">
        {CONSENT_TEXT.split("\n\n").map((para, i) => (
          <p key={i} className="text-sm text-gray-700 font-dm leading-relaxed mb-3 last:mb-0">
            {para}
          </p>
        ))}
      </div>

      <label className="flex items-start gap-3 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={coche}
          onChange={(e) => { setCoche(e.target.checked); setMsg(null); }}
          className="mt-1 w-5 h-5 rounded border-cream-300 text-orange-600 focus:ring-orange-500 flex-shrink-0"
        />
        <span className="text-sm text-gray-800 font-dm">
          J&apos;ai lu et j&apos;accepte que mes travaux soient publiés dans ces conditions.
        </span>
      </label>

      {dejaDecide && (
        <p className="text-xs text-gray-400 font-dm mt-3">
          {etat!.granted ? "Autorisation donnée le " : "Autorisation retirée le "}
          {new Date(etat!.decided_at).toLocaleDateString("fr-FR", {
            day: "numeric", month: "long", year: "numeric",
          })}
        </p>
      )}

      {change && (
        <button
          type="button"
          onClick={enregistrer}
          disabled={envoi}
          className="mt-5 px-5 py-2.5 rounded-xl bg-orange-DEFAULT text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition"
        >
          {envoi ? "Enregistrement…" : coche ? "Donner mon autorisation" : "Retirer mon autorisation"}
        </button>
      )}

      {msg && (
        <p className={`mt-4 text-sm font-dm ${msg.ok ? "text-green-600" : "text-red-600"}`}>
          {msg.text}
        </p>
      )}

      {!dejaDecide && !change && (
        <p className="mt-4 text-xs text-gray-400 font-dm">
          Tant que vous n&apos;avez rien coché, rien n&apos;est publié à votre sujet.
        </p>
      )}
    </div>
  );
}
