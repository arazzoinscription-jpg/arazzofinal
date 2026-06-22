"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { SidebarInner } from "./sidebar-inner";
import { DICT, type Lang } from "./dash-i18n";

/** Bouton hamburger + drawer latéral (mobile uniquement). */
export function MobileNav({
  nom, avatarUrl, role, roleLabel, lang, buyer = false,
}: {
  nom: string | null;
  avatarUrl: string | null;
  role: string;
  roleLabel: string;
  lang: Lang;
  buyer?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  // Le portail nécessite le DOM (rendu client uniquement).
  useEffect(() => setMounted(true), []);

  // Ferme le drawer à chaque navigation.
  useEffect(() => { setOpen(false); }, [pathname]);

  // Bloque le scroll du body quand le drawer est ouvert.
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  // Le drawer est rendu via un PORTAIL sur <body> : il échappe ainsi au
  // `backdrop-filter` de la barre supérieure (qui, sinon, confine tout
  // élément `position: fixed` enfant et empêche le menu d'apparaître).
  const drawer = open ? createPortal(
    <div className="lg:hidden fixed inset-0 z-[100]">
      <div
        onClick={() => setOpen(false)}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in"
      />
      <aside className="absolute inset-y-0 start-0 w-[86vw] max-w-[340px] h-full overflow-hidden flex flex-col bg-gradient-to-b from-violet-800 to-violet-900 shadow-2xl animate-in slide-in-from-left">
        <SidebarInner nom={nom} avatarUrl={avatarUrl} role={role} roleLabel={roleLabel} lang={lang} full onClose={() => setOpen(false)} buyer={buyer} />
      </aside>
    </div>,
    document.body,
  ) : null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label={DICT[lang].menu}
        aria-expanded={open}
        className="lg:hidden inline-flex items-center justify-center w-10 h-10 rounded-xl border border-cream-200 dark:border-white/15 text-gray-600 dark:text-white/70 hover:bg-cream-100 dark:hover:bg-white/10 transition-colors"
      >
        <Menu size={20} />
      </button>

      {mounted && drawer}
    </>
  );
}
