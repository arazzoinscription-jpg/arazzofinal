"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserRound } from "lucide-react";
import { SECTION_SETS, PRO_UI, type ProVariant, type Lang } from "./pro-data";

/** Menu COMPLET pro (sections + sous-liens) — utilisé dans le drawer mobile. */
export function ProNavFull({ variant, lang = "fr" }: { variant: ProVariant; lang?: Lang }) {
  const pathname = usePathname();
  const sections = SECTION_SETS[variant];
  const ui = PRO_UI[lang];

  const itemOn = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-2">
      <p className="px-3 mb-1 text-[11px] font-semibold uppercase tracking-wider text-white/40">{ui.navigation}</p>

      {sections.map((s) => {
        const Icon = s.icon;
        const headOn = pathname === s.home;
        return (
          <div key={s.key}>
            <Link
              href={s.home}
              className={`flex items-center gap-3 px-3.5 py-3 rounded-xl text-[15px] font-semibold transition-colors ${
                headOn ? "bg-orange-DEFAULT text-white shadow-sm" : "text-white/85 hover:bg-white/10 hover:text-white"
              }`}
            >
              <Icon size={20} className="flex-shrink-0" />
              <span className="truncate">{s.label[lang]}</span>
            </Link>

            {s.items.length > 0 && (
              <div className="ms-5 ps-3 border-s border-white/10 mt-1 space-y-0.5">
                {s.items.map((it) => {
                  const ItIcon = it.icon;
                  const on = itemOn(it.href);
                  return (
                    <Link
                      key={it.href}
                      href={it.href}
                      className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                        on ? "bg-white/15 text-white font-medium" : "text-white/60 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      <ItIcon size={17} className="flex-shrink-0" />
                      <span className="truncate">{it.label[lang]}</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      <div className="pt-3 mt-2 border-t border-white/10">
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
