"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserRound } from "lucide-react";
import { proActiveKey, PRO_UI, SECTION_SETS, type ProVariant, type Lang } from "./pro-data";

/** Menu vertical : grandes sections de l'espace pro (le détail va dans le menu horizontal). */
export function ProSidebar({
  variant, lang = "fr",
}: {
  variant: ProVariant; lang?: Lang;
}) {
  const pathname = usePathname();
  const sections = SECTION_SETS[variant];
  const active = proActiveKey(sections, pathname);
  const ui = PRO_UI[lang];

  return (
    <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5">
      <p className="px-3 mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-white/40">{ui.navigation}</p>

      {sections.map((s) => {
        const Icon = s.icon;
        const on = active === s.key;
        return (
          <Link
            key={s.key}
            href={s.home}
            className={`flex items-center gap-3 px-3.5 py-3 rounded-xl text-[15px] font-medium transition-colors ${
              on ? "bg-orange-DEFAULT text-white shadow-sm" : "text-white/70 hover:bg-white/10 hover:text-white"
            }`}
          >
            <Icon size={20} className="flex-shrink-0" />
            <span className="truncate">{s.label[lang]}</span>
          </Link>
        );
      })}

      <div className="pt-4 mt-3 border-t border-white/10">
        <Link
          href="/dashboard"
          className="flex items-center gap-3 px-3.5 py-3 rounded-xl text-[15px] font-medium text-white/60 hover:bg-white/10 hover:text-white transition-colors"
        >
          <UserRound size={20} className="flex-shrink-0" /> <span className="truncate">{ui.studentSpace}</span>
        </Link>
      </div>
    </nav>
  );
}
