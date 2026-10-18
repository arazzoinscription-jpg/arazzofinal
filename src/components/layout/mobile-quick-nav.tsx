"use client";

import { Home, LayoutGrid, Clapperboard, GraduationCap, Scissors, Ticket } from "lucide-react";
import { NavBar } from "@/components/ui/tubelight-navbar";

/**
 * Barre flottante « tubelight » — UNIQUE menu mobile de tout le site (masqué sur
 * desktop). Mêmes entrées partout → le menu ne change pas de style quand on navigue.
 * « Offre » (orange) et « La Cour » (sarcelle, le feed) sont mises en avant en couleur.
 */
const NOMS = {
  fr: { accueil: "Accueil", espace: "Mon espace", offre: "Offre", cour: "La Cour", formation: "Formation", patron: "Patron" },
  ar: { accueil: "الرئيسية", espace: "فضائي", offre: "العروض", cour: "الساحة", formation: "التكوين", patron: "الباترونات" },
  en: { accueil: "Home", espace: "My space", offre: "Offers", cour: "Courtyard", formation: "Courses", patron: "Patterns" },
} as const;

export function MobileQuickNav({ compact = false, lampId = "quicknav-mobile", monEspace = "/mon-espace", lang = "fr" }: {
  compact?: boolean; lampId?: string;
  /** Langue choisie (FR / ع / EN) quand la page la connaît. */
  lang?: keyof typeof NOMS;
  /** L'espace de la personne quand la page le connaît déjà (lien direct, sans passer par /mon-espace). */
  monEspace?: string;
}) {
  const n = NOMS[lang] ?? NOMS.fr;
  const items = [
    { name: n.accueil, url: "/", icon: Home },
    // « Mon espace » ouvre le bon espace selon le compte (formatrice → espace formateur).
    { name: n.espace, url: monEspace, icon: LayoutGrid },
    { name: n.offre, url: "/offres", icon: Ticket, color: "text-orange-600 dark:text-orange-300 hover:text-orange-700" },
    { name: n.cour, url: "/communaute", icon: Clapperboard, color: "text-teal-600 dark:text-teal-300 hover:text-teal-700" },
    { name: n.formation, url: "/formations", icon: GraduationCap },
    { name: n.patron, url: "/patrons", icon: Scissors },
  ];

  return <NavBar items={items} lampId={lampId} className="sm:hidden" compact={compact} />;
}
