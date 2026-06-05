"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { proActiveKey, proActiveItem, type ProSection, type Lang } from "./pro-data";

/** Menu horizontal : onglets des sous-pages de la section active. */
export function ProSubnav({
  sections, lang = "fr",
}: {
  sections: ProSection[]; lang?: Lang;
}) {
  const pathname = usePathname();
  const key = proActiveKey(sections, pathname);
  const section = sections.find((s) => s.key === key);
  if (!section || section.items.length === 0) return null;

  const activeHref = proActiveItem(section.items, pathname);

  return (
    <div className="border-t border-cream-200 dark:border-white/10 px-4 lg:px-8">
      <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-2">
        {section.items.map((it) => {
          const Icon = it.icon;
          const on = activeHref === it.href;
          return (
            <Link
              key={it.href}
              href={it.href}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
                on
                  ? "bg-orange-DEFAULT text-white shadow-sm"
                  : "text-gray-600 dark:text-white/60 hover:bg-cream-100 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              <Icon size={16} />
              {it.label[lang]}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
