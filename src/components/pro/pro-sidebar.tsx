"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserRound } from "lucide-react";
import { proActiveKey, PRO_UI, type ProSection, type Lang } from "./pro-data";

/** Menu vertical : grandes sections de l'espace pro (le détail va dans le menu horizontal). */
export function ProSidebar({
  sections, lang = "fr",
}: {
  sections: ProSection[]; lang?: Lang;
}) {
  const pathname = usePathname();
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
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              on ? "bg-orange-DEFAULT text-white shadow-sm" : "text-white/70 hover:bg-white/10 hover:text-white"
            }`}
          >
            <Icon size={19} />
            <span className="truncate">{s.label[lang]}</span>
          </Link>
        );
      })}

      <div className="pt-4 mt-3 border-t border-white/10">
        <Link
          href="/dashboard"
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white/60 hover:bg-white/10 hover:text-white transition-colors"
        >
          <UserRound size={19} /> <span className="truncate">{ui.studentSpace}</span>
        </Link>
      </div>
    </nav>
  );
}
