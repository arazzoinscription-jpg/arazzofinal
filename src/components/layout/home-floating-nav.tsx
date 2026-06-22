"use client";

import { Home, GraduationCap, Store, FileText, Clapperboard } from "lucide-react";
import { NavBar } from "@/components/ui/tubelight-navbar";

/**
 * Pilule « tubelight » flottante — menu principal de l'accueil (desktop uniquement).
 * Sur mobile, la barre du bas (MobileQuickNav) prend le relais.
 */
export function HomeFloatingNav() {
  const items = [
    { name: "Accueil", url: "/", icon: Home },
    { name: "Formations", url: "/formations", icon: GraduationCap },
    { name: "Boutique", url: "/boutique", icon: Store },
    { name: "Patrons", url: "/patrons", icon: FileText },
    { name: "Communauté", url: "/communaute", icon: Clapperboard },
  ];

  return (
    <NavBar
      items={items}
      lampId="quicknav-home"
      className="hidden sm:block sm:top-[4.75rem] sm:pt-2"
    />
  );
}
