"use client";

import { Home, GraduationCap, Store, FileText } from "lucide-react";
import { NavBar } from "@/components/ui/tubelight-navbar";

/** Barre flottante « tubelight » — navigation rapide mobile (masquée sur desktop). */
export function MobileQuickNav() {
  const items = [
    { name: "Accueil", url: "/", icon: Home },
    { name: "Formations", url: "/formations", icon: GraduationCap },
    { name: "Boutique", url: "/boutique", icon: Store },
    { name: "Patrons", url: "/patrons", icon: FileText },
  ];

  return <NavBar items={items} className="sm:hidden" />;
}
