"use client";

import Link from "next/link";
import { LogOut } from "lucide-react";
import { DashboardNav } from "./dashboard-nav";
import { DICT, type Lang } from "./dash-i18n";

/** Corps de la sidebar (logo + carte user + nav + déconnexion), partagé desktop & drawer mobile. */
export function SidebarInner({
  nom, avatarUrl, role, roleLabel, lang,
}: {
  nom: string | null;
  avatarUrl: string | null;
  role: string;
  roleLabel: string;
  lang: Lang;
}) {
  const t = DICT[lang];
  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/10">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="w-9 h-9 rounded-xl bg-orange-DEFAULT/90 flex items-center justify-center text-white text-lg">✂️</span>
          <div>
            <div className="font-playfair font-bold text-white text-lg leading-none">ARAZZO</div>
            <div className="font-playfair italic text-orange-300 text-xs">Formation</div>
          </div>
        </Link>
      </div>

      {/* Carte utilisateur */}
      <div className="px-4 py-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="w-11 h-11 rounded-full object-cover ring-2 ring-white/20" />
          ) : (
            <div className="w-11 h-11 rounded-full bg-white/15 ring-2 ring-white/20 flex items-center justify-center text-white font-bold">
              {nom?.[0]?.toUpperCase() ?? "?"}
            </div>
          )}
          <div className="min-w-0">
            <div className="text-white text-sm font-semibold truncate">{nom ?? "Élève"}</div>
            <div className="text-white/50 text-xs">{roleLabel}</div>
          </div>
        </div>
      </div>

      {/* Navigation groupée */}
      <DashboardNav role={role} lang={lang} />

      {/* Déconnexion */}
      <div className="p-3 border-t border-white/10">
        <form action="/api/auth/signout" method="POST">
          <button
            type="submit"
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-white/60 hover:text-white hover:bg-white/10 text-sm font-medium transition-colors"
          >
            <LogOut size={18} /> {t.logout ?? "Déconnexion"}
          </button>
        </form>
      </div>
    </div>
  );
}
