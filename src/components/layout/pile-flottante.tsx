"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Clapperboard, PlayCircle, School, type LucideIcon } from "lucide-react";
import type { CoursEnCours } from "@/lib/cours-en-cours";

type Bouton = { href: string; titre: string; sous?: string; Icone: LucideIcon; pastille: string; fond: string };
type Langue = "fr" | "ar" | "en";

const TITRES: Record<Langue, { cours: string; classe: string; cour: string }> = {
  fr: { cours: "Mon cours", classe: "Ma classe", cour: "La Cour" },
  ar: { cours: "الدرس", classe: "القسم", cour: "الساحة" },
  en: { cours: "My course", classe: "My class", cour: "The Courtyard" },
};

/**
 * Les boutons flottants de l'espace élève, EMPILÉS en bas à gauche (la bulle de messagerie est à droite) :
 * « Mon cours » (la dernière leçon ouverte), « Ma classe » et « La Cour ». Chacun disparaît quand on y est déjà.
 * Toute la pile se cache quand la messagerie est ouverte (sur téléphone, elle prend toute la largeur).
 */
export function PileFlottante({ cours, lang = "fr" }: { cours: CoursEnCours | null; lang?: Langue }) {
  const chemin = usePathname() ?? "";
  const t = TITRES[lang] ?? TITRES.fr;
  const boutons: Bouton[] = [];
  if (cours && !chemin.startsWith("/dashboard/cours/")) {
    boutons.push({
      href: `/dashboard/cours/${cours.lessonId}`, titre: t.cours, sous: cours.lecon, Icone: PlayCircle,
      pastille: "bg-gradient-to-br from-[#FE7223] to-[#5B16F9] text-white",
      fond: "bg-white dark:bg-[#1c1535] text-[#2A0880] dark:text-white border border-violet-200 dark:border-white/15",
    });
  }
  if (!chemin.startsWith("/dashboard/classe")) {
    boutons.push({
      href: "/dashboard/classe", titre: t.classe, Icone: School,
      pastille: "bg-white/20 text-white", fond: "bg-gradient-to-br from-[#5B16F9] to-[#FE7223] text-white",
    });
  }
  boutons.push({
    href: "/communaute", titre: t.cour, Icone: Clapperboard,
    pastille: "bg-white/20 text-white", fond: "bg-gradient-to-br from-teal-500 to-teal-700 text-white",
  });

  return (
    <div className="fixed z-40 bottom-24 lg:bottom-6 start-3 lg:start-[17.5rem] flex flex-col items-start gap-2 [html[data-chat-ouvert]_&]:hidden">
      {boutons.map((b) => (
        <Link key={b.href} href={b.href} aria-label={b.sous ? `${b.titre} : ${b.sous}` : b.titre} title={b.sous ? `${b.titre} — ${b.sous}` : b.titre}
          className={`inline-flex items-center gap-2 h-11 lg:h-12 ps-1.5 pe-3.5 max-w-[min(15rem,calc(100vw-7rem))] rounded-full shadow-lg shadow-black/15 hover:scale-105 transition-transform focus:outline-none focus-visible:ring-4 focus-visible:ring-[#5B16F9]/40 ${b.fond}`}>
          <span className={`w-8 h-8 lg:w-9 lg:h-9 rounded-full flex items-center justify-center shrink-0 ${b.pastille}`} aria-hidden><b.Icone size={18} /></span>
          <span className="min-w-0 leading-tight">
            <span className="block text-[13px] lg:text-sm font-semibold">{b.titre}</span>
            {b.sous ? <span className="hidden sm:block text-[11px] text-gray-500 dark:text-white/60 truncate">{b.sous}</span> : null}
          </span>
        </Link>
      ))}
    </div>
  );
}
