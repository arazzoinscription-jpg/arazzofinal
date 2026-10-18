"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { School } from "lucide-react";

/**
 * Bouton flottant « Ma classe », dans chaque espace (élève, formatrice, administration) :
 * en bas à gauche (la bulle de messagerie est à droite), juste après le menu latéral sur ordinateur.
 * Masqué quand on est déjà dans « Ma classe », et pendant que la messagerie est ouverte.
 */
export function BoutonMaClasse({ href }: { href: "/dashboard/classe" | "/formateur/classe" | "/admin/classe" }) {
  const chemin = usePathname() ?? "";
  if (chemin === href || chemin.startsWith(`${href}/`)) return null;
  return (
    <Link
      href={href}
      aria-label="Ouvrir Ma classe"
      className="[html[data-chat-ouvert]_&]:hidden fixed z-40 bottom-24 lg:bottom-6 start-4 lg:start-[17.5rem] inline-flex items-center gap-2 h-14 ps-3 pe-4 rounded-full bg-gradient-to-br from-[#5B16F9] to-[#FE7223] text-white shadow-lg shadow-black/20 hover:scale-105 transition-transform focus:outline-none focus-visible:ring-4 focus-visible:ring-[#5B16F9]/40"
    >
      <span className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center" aria-hidden><School size={20} /></span>
      <span className="text-sm font-semibold">Ma classe</span>
    </Link>
  );
}
