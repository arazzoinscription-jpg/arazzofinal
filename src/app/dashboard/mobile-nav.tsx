"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { SidebarInner } from "./sidebar-inner";
import { DICT, type Lang } from "./dash-i18n";

/** Bouton hamburger + drawer latéral (mobile uniquement). */
export function MobileNav({
  nom, avatarUrl, role, roleLabel, lang,
}: {
  nom: string | null;
  avatarUrl: string | null;
  role: string;
  roleLabel: string;
  lang: Lang;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Ferme le drawer à chaque navigation.
  useEffect(() => { setOpen(false); }, [pathname]);

  // Bloque le scroll du body quand le drawer est ouvert.
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label={DICT[lang].menu}
        className="lg:hidden inline-flex items-center justify-center w-10 h-10 rounded-xl border border-cream-200 dark:border-white/15 text-gray-600 dark:text-white/70 hover:bg-cream-100 dark:hover:bg-white/10 transition-colors"
      >
        <Menu size={20} />
      </button>

      {open && (
        <div className="lg:hidden fixed inset-0 z-50">
          {/* Backdrop */}
          <div
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in"
          />
          {/* Drawer */}
          <aside className="absolute inset-y-0 start-0 w-[86vw] max-w-[340px] flex flex-col bg-gradient-to-b from-violet-800 to-violet-900 shadow-2xl">
            <button
              onClick={() => setOpen(false)}
              aria-label="Fermer"
              className="absolute top-4 end-4 z-10 w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
            >
              <X size={18} />
            </button>
            <SidebarInner nom={nom} avatarUrl={avatarUrl} role={role} roleLabel={roleLabel} lang={lang} />
          </aside>
        </div>
      )}
    </>
  );
}
