"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PlayCircle } from "lucide-react";

/**
 * Bouton flottant « Mon cours » (espace élève) : ramène à la page du cours en cours — le programme et la vidéo —
 * sur la dernière leçon ouverte. Juste au-dessus de « Ma classe » ; masqué quand on est déjà dans le cours.
 */
export function BoutonMonCours({ cours }: { cours: { lessonId: string; lecon: string; cours: string } | null }) {
  const chemin = usePathname() ?? "";
  if (!cours || chemin.startsWith("/dashboard/cours/")) return null;
  return (
    <Link
      href={`/dashboard/cours/${cours.lessonId}`}
      aria-label={`Reprendre mon cours : ${cours.cours} — ${cours.lecon}`}
      title={`${cours.cours} — ${cours.lecon}`}
      className="fixed z-40 bottom-[10.5rem] lg:bottom-[5.75rem] start-4 lg:start-[17.5rem] inline-flex items-center gap-2 h-14 ps-3 pe-4 max-w-[min(18rem,calc(100vw-6rem))] rounded-full bg-white dark:bg-[#1c1535] text-[#2A0880] dark:text-white border border-violet-200 dark:border-white/15 shadow-lg shadow-black/15 hover:scale-105 transition-transform focus:outline-none focus-visible:ring-4 focus-visible:ring-[#5B16F9]/40"
    >
      <span className="w-9 h-9 rounded-full bg-gradient-to-br from-[#FE7223] to-[#5B16F9] text-white flex items-center justify-center shrink-0" aria-hidden><PlayCircle size={20} /></span>
      <span className="min-w-0 leading-tight">
        <span className="block text-sm font-semibold">Mon cours</span>
        <span className="block text-[11px] text-gray-500 dark:text-white/60 truncate">{cours.lecon}</span>
      </span>
    </Link>
  );
}
