"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sparkles, Newspaper, Users, Tag } from "lucide-react";

/**
 * Menu UNIQUE de la communauté, partagé par le feed, les actualités et les
 * groupes → on reste dans le même environnement en navigant.
 * 4 entrées : Pour toi · Actualité · Groups · Offre.
 */
const TABS = [
  { href: "/communaute", label: "Pour toi", icon: Sparkles, match: (p: string) => p === "/communaute" },
  { href: "/communaute/actualites", label: "Actualité", icon: Newspaper, match: (p: string) => p.startsWith("/communaute/actualites") },
  { href: "/communaute/groupes", label: "Groups", icon: Users, match: (p: string) => p.startsWith("/communaute/groupes") },
  { href: "/offre", label: "Offre", icon: Tag, match: (p: string) => p.startsWith("/offre") },
];

export function CommunityTabs() {
  const pathname = usePathname();
  return (
    <div className="flex items-center justify-center gap-5 sm:gap-7 overflow-x-auto px-3">
      {TABS.map((t) => {
        const active = t.match(pathname);
        const Icon = t.icon;
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? "page" : undefined}
            className={`relative inline-flex items-center gap-1.5 whitespace-nowrap text-sm font-semibold pb-1 transition-colors ${
              active ? "text-white" : "text-white/55 hover:text-white"
            }`}
          >
            <Icon size={15} /> {t.label}
            {active && <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-5 h-0.5 bg-white rounded-full" />}
          </Link>
        );
      })}
    </div>
  );
}
