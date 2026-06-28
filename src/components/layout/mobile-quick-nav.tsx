"use client";

import { Home, LayoutGrid, Clapperboard, GraduationCap, Scissors } from "lucide-react";
import { NavBar } from "@/components/ui/tubelight-navbar";

/**
 * Barre flottante « tubelight » — UNIQUE menu mobile de tout le site (masqué sur
 * desktop). Mêmes 5 entrées partout (pages publiques, boutique, communauté,
 * espace élève) → le menu ne change pas de style quand on navigue.
 */
export function MobileQuickNav() {
  const items = [
    { name: "Accueil", url: "/", icon: Home },
    { name: "Mon espace", url: "/dashboard", icon: LayoutGrid },
    { name: "Communauté", url: "/communaute", icon: Clapperboard },
    { name: "Formation", url: "/formations", icon: GraduationCap },
    { name: "Patron", url: "/patrons", icon: Scissors },
  ];

  return <NavBar items={items} lampId="quicknav-mobile" className="sm:hidden" />;
}
