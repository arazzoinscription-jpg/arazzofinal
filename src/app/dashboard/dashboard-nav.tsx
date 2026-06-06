"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { GraduationCap, ShieldCheck, Shapes } from "lucide-react";
import { SECTIONS, activeSectionKey } from "./nav-data";
import { DICT, type Lang } from "./dash-i18n";

/** Sidebar verticale : grandes sections (le détail va dans le menu horizontal). */
export function DashboardNav({ role, lang = "fr" }: { role: string; lang?: Lang }) {
  const pathname = usePathname();
  const active = activeSectionKey(pathname);
  const t = DICT[lang];

  return (
    <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
      <p className="px-3 mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-white/40">{t.navigation}</p>

      {SECTIONS.map((s) => {
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

      {(role === "formateur" || role === "admin" || role === "patronniste") && (
        <div className="pt-4 mt-3 border-t border-white/10 space-y-1">
          <p className="px-3 mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-white/40">{t.pro}</p>
          {(role === "formateur" || role === "admin") && (
            <Link href="/formateur"
              className="flex items-center gap-3 px-3.5 py-3 rounded-xl text-[15px] font-semibold text-orange-200 hover:bg-white/10 hover:text-orange-100 transition-colors">
              <GraduationCap size={20} className="flex-shrink-0" /> {t.trainer}
            </Link>
          )}
          {(role === "patronniste" || role === "admin") && (
            <Link href="/patronniste"
              className="flex items-center gap-3 px-3.5 py-3 rounded-xl text-[15px] font-semibold text-orange-200 hover:bg-white/10 hover:text-orange-100 transition-colors">
              <Shapes size={20} className="flex-shrink-0" /> {t.patronniste}
            </Link>
          )}
          {role === "admin" && (
            <Link href="/admin"
              className="flex items-center gap-3 px-3.5 py-3 rounded-xl text-[15px] font-semibold text-orange-200 hover:bg-white/10 hover:text-orange-100 transition-colors">
              <ShieldCheck size={20} className="flex-shrink-0" /> {t.admin}
            </Link>
          )}
        </div>
      )}
    </nav>
  );
}
