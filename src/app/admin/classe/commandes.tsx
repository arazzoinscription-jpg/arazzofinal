"use client";

import Link from "next/link";
import { CalendarPlus, Radio, Mail, MessageCircle, Megaphone, type LucideIcon } from "lucide-react";
import { commandesPour, EVENEMENT_MESSAGERIE, type Commande, type DetailMessagerie } from "@/lib/classe/communication";

const ICONE: Record<Commande["cle"], LucideIcon> = {
  programmer_live: CalendarPlus, passer_live: Radio, email: Mail, message: MessageCircle, annonce: Megaphone,
};
const TON: Record<Commande["cle"], string> = {
  programmer_live: "from-[#5B16F9] to-[#3a0fb0] text-white",
  passer_live: "from-red-500 to-red-600 text-white",
  email: "from-white to-white text-gray-700",
  message: "from-white to-white text-gray-800",
  annonce: "from-orange-500 to-orange-600 text-white",
};

/** Ouvre la bulle « Messagerie » du site (sur une élève si `detail.id`). N'envoie rien. */
export function ouvrirMessagerie(detail: DetailMessagerie = {}) {
  window.dispatchEvent(new CustomEvent<DetailMessagerie>(EVENEMENT_MESSAGERIE, { detail }));
}

function Contenu({ c }: { c: Commande }) {
  const Icone = ICONE[c.cle];
  return (
    <>
      <span className="w-9 h-9 rounded-xl bg-black/10 flex items-center justify-center flex-shrink-0" aria-hidden><Icone size={18} /></span>
      <span className="text-left leading-tight">
        <span className="block text-sm font-semibold">{c.libelle}</span>
        <span className={`block text-[11px] ${c.etat === "branche" ? "opacity-80" : "text-amber-700 font-semibold"}`}>
          {c.etat === "branche" ? (c.href ? "Ouvre l'outil existant" : "Ouvre la messagerie") : "À connecter"}
        </span>
      </span>
    </>
  );
}

/** Barre de commande de l'enseignante : chaque bouton ouvre un outil EXISTANT, ou dit qu'il reste à connecter. */
export function BarreCommande({ base }: { base: string }) {
  const style = "group flex items-center gap-2.5 sm:gap-3 rounded-2xl px-3 sm:px-3.5 py-2.5 sm:py-3 bg-gradient-to-br shadow-sm border border-black/5 hover:shadow-md transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5B16F9]";
  return (
    <nav aria-label="Commandes de l'enseignante" className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-2.5 mb-6">
      {commandesPour(base).map((c) => {
        const classes = `${style} ${TON[c.cle]}`;
        if (c.etat === "a_connecter") {
          return (
            <details key={c.cle} className="relative">
              <summary className={`${classes} list-none cursor-pointer border-dashed opacity-90`} title={c.detail}>
                <Contenu c={c} />
              </summary>
              <div className="absolute z-20 mt-2 w-72 max-w-[85vw] rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 shadow-lg">
                {c.detail}
              </div>
            </details>
          );
        }
        if (c.href) {
          return <Link key={c.cle} href={c.href} className={classes} title={c.detail}><Contenu c={c} /></Link>;
        }
        return (
          <button key={c.cle} type="button" className={classes} title={c.detail} onClick={() => ouvrirMessagerie()}>
            <Contenu c={c} />
          </button>
        );
      })}
    </nav>
  );
}
