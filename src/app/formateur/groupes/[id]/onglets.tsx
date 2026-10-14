"use client";

import { useEffect, useState } from "react";
import { MessageCircle, Newspaper, Users } from "lucide-react";

const ICONES = { publications: Newspaper, membres: Users, whatsapp: MessageCircle } as const;
export type CleOnglet = keyof typeof ICONES;

/** Gestion d'un groupe en onglets (publications · membres · WhatsApp) ; l'onglet ouvert reste dans l'adresse. */
export function OngletsGroupe({ onglets, initial }: {
  onglets: { cle: CleOnglet; titre: string; compte?: number; contenu: React.ReactNode }[];
  initial: CleOnglet;
}) {
  const [actif, setActif] = useState<CleOnglet>(onglets.some((o) => o.cle === initial) ? initial : onglets[0].cle);
  useEffect(() => {
    const u = new URL(window.location.href);
    u.searchParams.set("onglet", actif);
    window.history.replaceState(null, "", u.toString());
  }, [actif]);
  return (
    <div>
      <div role="tablist" aria-label="Gestion du groupe" className="flex gap-1.5 overflow-x-auto border-b border-cream-200 mb-4">
        {onglets.map((o) => {
          const Icone = ICONES[o.cle];
          const choisi = o.cle === actif;
          return (
            <button key={o.cle} type="button" role="tab" aria-selected={choisi} aria-controls={`onglet-${o.cle}`} id={`tab-${o.cle}`}
              onClick={() => setActif(o.cle)}
              className={`shrink-0 inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition ${choisi ? "border-[#5B16F9] text-[#5B16F9]" : "border-transparent text-gray-500 hover:text-gray-800"}`}>
              <Icone size={16} aria-hidden /> {o.titre}
              {typeof o.compte === "number" ? <span className={`rounded-full px-2 py-0.5 text-[11px] ${choisi ? "bg-[#5B16F9]/10" : "bg-gray-100"}`}>{o.compte}</span> : null}
            </button>
          );
        })}
      </div>
      {onglets.map((o) => (
        <div key={o.cle} role="tabpanel" id={`onglet-${o.cle}`} aria-labelledby={`tab-${o.cle}`} hidden={o.cle !== actif}>
          {o.contenu}
        </div>
      ))}
    </div>
  );
}
