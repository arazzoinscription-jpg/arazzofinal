"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { Plus } from "lucide-react";
import { EditeurStory } from "./editeur-story";

/**
 * « Ajouter une story » : ouvre l'éditeur plein écran (photo, vidéo de 30 s ou texte seul, puis texte,
 * dessin, autocollants, question, sondage, compte à rebours, lien). Visible 24 h.
 * `equipe` : enseignantes et administration peuvent aussi mettre un lien vers un autre site.
 */
export function AjouterStory({ variante = "bouton", sombre = false, equipe = false }: { variante?: "bouton" | "pastille"; sombre?: boolean; equipe?: boolean }) {
  const [ouvert, setOuvert] = useState(false);

  return (
    <>
      {variante === "pastille" ? (
        <button type="button" onClick={() => setOuvert(true)} aria-label="Ajouter une story"
          className="absolute -bottom-0.5 -end-0.5 w-6 h-6 rounded-full bg-[#5B16F9] text-white ring-2 ring-white flex items-center justify-center"><Plus size={14} /></button>
      ) : (
        <button type="button" onClick={() => setOuvert(true)}
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${sombre ? "bg-white/10 text-white hover:bg-white/20" : "bg-[#5B16F9]/10 text-[#5B16F9] hover:bg-[#5B16F9]/15"}`}>
          <Plus size={14} aria-hidden /> Ajouter une story
        </button>
      )}
      {/* Rendu dans <body> : l'éditeur reste plein écran même dans une barre fixe ou une carte transformée. */}
      {ouvert ? createPortal(<EditeurStory equipe={equipe} onFermer={() => setOuvert(false)} />, document.body) : null}
    </>
  );
}
