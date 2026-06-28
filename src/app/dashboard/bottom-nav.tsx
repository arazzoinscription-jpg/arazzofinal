"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, LayoutGrid, Clapperboard, GraduationCap, Scissors } from "lucide-react";
import type { Lang } from "./dash-i18n";

const LABELS: Record<Lang, { home: string; space: string; community: string; courses: string; patterns: string }> = {
  fr: { home: "Accueil", space: "Mon espace", community: "Communauté", courses: "Formation", patterns: "Patronnage" },
  ar: { home: "الرئيسية", space: "مساحتي", community: "المجتمع", courses: "التكوين", patterns: "الباترون" },
  en: { home: "Home", space: "My space", community: "Community", courses: "Courses", patterns: "Patterns" },
};

/**
 * Barre de navigation MOBILE en bas de l'écran (masquée ≥ lg).
 * 5 entrées : Accueil · Mon espace · Communauté · Formation · Patronnage.
 */
export function DashboardBottomNav({ lang }: { lang: Lang }) {
  const pathname = usePathname();
  const t = LABELS[lang] ?? LABELS.fr;

  const items = [
    { href: "/", label: t.home, icon: Home, match: (p: string) => p === "/" },
    { href: "/dashboard", label: t.space, icon: LayoutGrid, match: (p: string) => p === "/dashboard" || p.startsWith("/dashboard/") },
    { href: "/communaute", label: t.community, icon: Clapperboard, match: (p: string) => p.startsWith("/communaute") },
    { href: "/formations", label: t.courses, icon: GraduationCap, match: (p: string) => p.startsWith("/formations") || p.startsWith("/offre") },
    { href: "/patrons", label: t.patterns, icon: Scissors, match: (p: string) => p.startsWith("/patrons") },
  ];

  return (
    <nav
      aria-label={t.space}
      data-onboarding="bottom-nav"
      className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 dark:bg-[#120d24]/95 backdrop-blur-md border-t border-cream-200 dark:border-white/10 pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="grid grid-cols-5">
        {items.map((it) => {
          const active = it.match(pathname);
          const Icon = it.icon;
          return (
            <li key={it.href}>
              <Link
                href={it.href}
                aria-current={active ? "page" : undefined}
                className={`flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition-colors ${
                  active ? "text-orange-600 dark:text-orange-400" : "text-gray-400 dark:text-white/45 hover:text-violet-700 dark:hover:text-white/70"
                }`}
              >
                <Icon size={21} className={active ? "scale-110 transition-transform" : "transition-transform"} />
                <span className="leading-none">{it.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
