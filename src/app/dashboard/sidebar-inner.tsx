"use client";

import Link from "next/link";
import { LogOut, X } from "lucide-react";
import { DashboardNav } from "./dashboard-nav";
import { DashboardNavFull } from "./dashboard-nav-full";
import { SidebarToggle } from "@/components/layout/sidebar-toggle";
import { DICT, type Lang } from "./dash-i18n";

/** Corps de la sidebar (logo + carte user + nav + déconnexion), partagé desktop & drawer mobile. */
export function SidebarInner({
  nom, avatarUrl, role, roles = [], roleLabel, lang, full = false, onClose, buyer = false,
}: {
  nom: string | null;
  avatarUrl: string | null;
  role: string;
  roles?: string[];
  roleLabel: string;
  lang: Lang;
  /** Affiche le menu complet (sections + sous-liens) — pour le drawer mobile. */
  full?: boolean;
  /** Bouton fermer (drawer mobile uniquement). */
  onClose?: () => void;
  /** Acheteur de patrons : navigation réduite. */
  buyer?: boolean;
}) {
  const t = DICT[lang];
  return (
    <div className="flex flex-col h-full">
      {/* Logo + fermer */}
      <div className="px-5 py-5 border-b border-white/10 flex items-center justify-between gap-2">
        <Link href="/" className="nav-center flex items-center gap-2.5 min-w-0">
          <span className="w-9 h-9 rounded-xl bg-orange-DEFAULT/90 flex items-center justify-center text-white text-lg flex-shrink-0">✂️</span>
          <div className="min-w-0 nav-label">
            <div className="font-playfair font-bold text-white text-lg leading-none">ARAZZO</div>
            <div className="font-playfair italic text-orange-300 text-xs">Formation</div>
          </div>
        </Link>
        {onClose && (
          <button onClick={onClose} aria-label="Fermer"
            className="flex-shrink-0 w-9 h-9 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors">
            <X size={18} />
          </button>
        )}
      </div>

      {/* Carte utilisateur */}
      <div className="px-4 py-4 border-b border-white/10">
        <div className="nav-center flex items-center gap-3">
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="w-11 h-11 rounded-full object-cover ring-2 ring-white/20 flex-shrink-0" />
          ) : (
            <div className="w-11 h-11 rounded-full bg-white/15 ring-2 ring-white/20 flex items-center justify-center text-white font-bold flex-shrink-0">
              {nom?.[0]?.toUpperCase() ?? "?"}
            </div>
          )}
          <div className="min-w-0 nav-label">
            <div className="text-white text-sm font-semibold truncate">{nom ?? "Élève"}</div>
            <div className="text-white/50 text-xs">{roleLabel}</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      {full ? <DashboardNavFull role={role} roles={roles} lang={lang} buyer={buyer} /> : <DashboardNav role={role} roles={roles} lang={lang} buyer={buyer} />}

      {/* Déconnexion */}
      <div className="p-3 border-t border-white/10">
        <form action="/api/auth/signout" method="POST">
          <button
            type="submit"
            className="nav-center w-full flex items-center gap-3 px-3 py-2 rounded-xl text-white/60 hover:text-white hover:bg-white/10 text-sm font-medium transition-colors"
          >
            <LogOut size={18} className="flex-shrink-0" /> <span className="nav-label">{t.logout ?? "Déconnexion"}</span>
          </button>
        </form>
      </div>

      {/* Replier / déployer (desktop uniquement) */}
      {!full && <SidebarToggle />}
    </div>
  );
}
