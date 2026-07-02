"use client";

import { Home, LayoutGrid, Clapperboard, GraduationCap, Scissors, Ticket } from "lucide-react";
import { NavBar } from "@/components/ui/tubelight-navbar";

/**
 * Barre flottante « tubelight » — UNIQUE menu mobile de tout le site (masqué sur
 * desktop). Mêmes entrées partout → le menu ne change pas de style quand on navigue.
 * « Offre » (orange) et « Communauté » (sarcelle) sont mises en avant en couleur.
 */
export function MobileQuickNav({ compact = false }: { compact?: boolean }) {
  const items = [
    { name: "Accueil", url: "/", icon: Home },
    { name: "Mon espace", url: "/dashboard", icon: LayoutGrid },
    { name: "Offre", url: "/offre", icon: Ticket, color: "text-orange-600 dark:text-orange-300 hover:text-orange-700" },
    { name: "Communauté", url: "/communaute", icon: Clapperboard, color: "text-teal-600 dark:text-teal-300 hover:text-teal-700" },
    { name: "Formation", url: "/formations", icon: GraduationCap },
    { name: "Patron", url: "/patrons", icon: Scissors },
  ];

  return <NavBar items={items} lampId="quicknav-mobile" className="sm:hidden" compact={compact} />;
}
