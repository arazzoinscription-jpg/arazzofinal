"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { GraduationCap, Scissors, Shapes, Shield, LayoutGrid, Check, ChevronDown } from "lucide-react";
import { PRO_UI } from "./pro-data";
import { getRoles, type Role } from "@/lib/roles";
import type { Lang } from "@/app/dashboard/dash-i18n";

type SpaceKey = "eleve" | "formateur" | "patronniste" | "admin";

export function SpaceSwitcher({
  role, roles, current, lang,
}: {
  role: string | null;
  roles: string[];
  current: SpaceKey;
  lang: Lang;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const ui = PRO_UI[lang];

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  // Ensemble des rôles → l'admin voit tous les espaces (getRoles/hasRole logique).
  const owned = getRoles({ role, roles });
  const isAdmin = owned.includes("admin");

  const spaces: { key: SpaceKey; href: string; label: string; icon: typeof GraduationCap }[] = [
    { key: "eleve", href: "/dashboard", label: ui.studentSpace, icon: GraduationCap },
    { key: "formateur", href: "/formateur", label: ui.formateurSpace, icon: Scissors },
    { key: "patronniste", href: "/patronniste", label: ui.patronnisteSpace, icon: Shapes },
    { key: "admin", href: "/admin", label: ui.adminSpace, icon: Shield },
  ];

  const available = spaces.filter((s) => {
    if (s.key === "eleve") return true;
    if (isAdmin) return true; // admin accède à tous les espaces
    return (owned as Role[]).includes(s.key as Role);
  });

  // Un seul espace disponible → pas de sélecteur.
  if (available.length <= 1) return null;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-xl border border-black/10 dark:border-white/15 bg-white/80 dark:bg-white/5 px-2.5 py-2 text-sm font-medium text-gray-700 dark:text-white/80 hover:bg-white dark:hover:bg-white/10 transition-colors"
        aria-label={ui.changeSpace}
        title={ui.changeSpace}
      >
        <LayoutGrid size={16} className="text-orange-500" />
        <span className="hidden sm:inline">{ui.changeSpace}</span>
        <ChevronDown size={14} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute end-0 mt-2 w-60 rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#171233] shadow-xl p-1.5 z-50">
          {available.map((s) => {
            const active = s.key === current;
            const Icon = s.icon;
            return (
              <Link
                key={s.key}
                href={s.href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                  active
                    ? "bg-orange-50 dark:bg-white/10 text-orange-700 dark:text-orange-300 font-semibold"
                    : "text-gray-700 dark:text-white/80 hover:bg-gray-50 dark:hover:bg-white/5"
                }`}
              >
                <span className="w-8 h-8 rounded-lg bg-violet-100 dark:bg-white/10 flex items-center justify-center text-violet-600 dark:text-violet-300 flex-shrink-0">
                  <Icon size={16} />
                </span>
                <span className="flex-1 min-w-0 truncate">{s.label}</span>
                {active && <Check size={16} className="text-orange-500 flex-shrink-0" />}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
