"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  name: string;
  url: string;
  icon: LucideIcon;
}

interface NavBarProps {
  items: NavItem[];
  className?: string;
  /** Identifiant unique de l'animation « lampe » (évite les conflits si plusieurs barres montées). */
  lampId?: string;
}

export function NavBar({ items, className, lampId = "lamp" }: NavBarProps) {
  const [activeTab, setActiveTab] = useState(items[0].name);
  const pathname = usePathname();

  // Onglet actif synchronisé avec la route courante.
  useEffect(() => {
    const match = items.find(
      (i) => i.url !== "#" && (pathname === i.url || pathname.startsWith(i.url + "/")),
    );
    if (match) setActiveTab(match.name);
  }, [pathname, items]);

  return (
    <div
      className={cn(
        "fixed bottom-0 sm:top-0 inset-x-3 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 z-50 mb-4 sm:mb-0 sm:pt-6",
        className,
      )}
    >
      <div className="flex items-center justify-around sm:justify-start gap-1 sm:gap-3 bg-white dark:bg-[#15102b] border border-cream-200 dark:border-white/10 backdrop-blur-lg py-1.5 px-2 sm:py-1 sm:px-1 rounded-2xl sm:rounded-full shadow-xl">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.name;

          return (
            <Link
              key={item.name}
              href={item.url}
              onClick={(e) => {
                // Déjà sur cette page (ex. « Communauté » sur le feed) : on évite la
                // renavigation qui remonterait la page et « sortirait » du feed.
                if (item.url !== "#" && pathname === item.url) e.preventDefault();
                setActiveTab(item.name);
              }}
              className={cn(
                "relative cursor-pointer flex-1 sm:flex-none flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-2 text-[11px] sm:text-sm font-semibold px-2 sm:px-6 py-2 rounded-xl sm:rounded-full transition-colors",
                "text-violet-950/70 dark:text-white/70 hover:text-[#6B21C8] dark:hover:text-violet-300",
                isActive && "bg-violet-50 dark:bg-white/10 text-[#6B21C8] dark:text-violet-200",
              )}
            >
              <Icon size={22} strokeWidth={2.5} className="md:hidden" />
              <span className="md:hidden">{item.name}</span>
              <span className="hidden md:inline">{item.name}</span>
              {isActive && (
                <motion.div
                  layoutId={lampId}
                  className="absolute inset-0 w-full bg-[#6B21C8]/5 rounded-full -z-10"
                  initial={false}
                  transition={{
                    type: "spring",
                    stiffness: 300,
                    damping: 30,
                  }}
                >
                  <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-8 h-1 bg-[#6B21C8] rounded-t-full">
                    <div className="absolute w-12 h-6 bg-[#6B21C8]/20 rounded-full blur-md -top-2 -left-2" />
                    <div className="absolute w-8 h-6 bg-[#6B21C8]/20 rounded-full blur-md -top-1" />
                    <div className="absolute w-4 h-4 bg-[#6B21C8]/20 rounded-full blur-sm top-0 left-2" />
                  </div>
                </motion.div>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
