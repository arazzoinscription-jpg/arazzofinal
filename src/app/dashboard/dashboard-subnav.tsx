"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { SECTIONS, activeSectionKey } from "./nav-data";
import type { Lang } from "./dash-i18n";

const MotionLink = motion.create(Link);

/** Menu horizontal : onglets des sous-pages de la section active. */
export function DashboardSubnav({ lang = "fr" }: { lang?: Lang }) {
  const pathname = usePathname();
  const key = activeSectionKey(pathname);
  const section = SECTIONS.find((s) => s.key === key);
  if (!section || section.items.length === 0) return null;

  return (
    <div className="border-t border-cream-200 dark:border-white/10 px-4 lg:px-8">
      <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-2">
        {section.items.map((it) => {
          const Icon = it.icon;
          const on = pathname === it.href || pathname.startsWith(it.href + "/");
          return (
            <MotionLink
              key={it.href}
              href={it.href}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.96 }}
              transition={{ duration: 0.2 }}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
                on
                  ? "bg-orange-DEFAULT text-white shadow-sm"
                  : "text-gray-600 dark:text-white/60 hover:bg-cream-100 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              <Icon size={16} />
              {it.label[lang]}
            </MotionLink>
          );
        })}
      </div>
    </div>
  );
}
