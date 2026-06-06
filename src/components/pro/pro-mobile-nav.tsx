"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Menu, X, LogOut } from "lucide-react";
import { ProNavFull } from "./pro-nav-full";
import { PRO_UI, type ProVariant, type Lang } from "./pro-data";

/** Bouton hamburger + drawer latéral pour les espaces pro (mobile uniquement). */
export function ProMobileNav({
  variant, nom, avatarUrl, roleLabel, lang, brand,
}: {
  variant: ProVariant;
  nom: string | null;
  avatarUrl: string | null;
  roleLabel: string;
  lang: Lang;
  brand: string;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const ui = PRO_UI[lang];

  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Menu"
        className="lg:hidden inline-flex items-center justify-center w-10 h-10 rounded-xl border border-cream-200 dark:border-white/15 text-gray-600 dark:text-white/70 hover:bg-cream-100 dark:hover:bg-white/10 transition-colors"
      >
        <Menu size={20} />
      </button>

      {open && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div onClick={() => setOpen(false)} className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <aside className="absolute inset-y-0 start-0 w-[86vw] max-w-[340px] flex flex-col bg-gradient-to-b from-violet-800 to-violet-900 shadow-2xl">
            <button
              onClick={() => setOpen(false)}
              aria-label="Fermer"
              className="absolute top-4 end-4 z-10 w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
            >
              <X size={18} />
            </button>

            {/* Logo */}
            <div className="px-5 py-5 border-b border-white/10">
              <Link href="/" className="flex items-center gap-2.5">
                <span className="w-9 h-9 rounded-xl bg-orange-DEFAULT/90 flex items-center justify-center text-white text-lg">✂️</span>
                <div>
                  <div className="font-playfair font-bold text-white text-lg leading-none">ARAZZO</div>
                  <div className="font-playfair italic text-orange-300 text-xs">{brand}</div>
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
                  <div className="text-white text-sm font-semibold truncate">{nom ?? "—"}</div>
                  <div className="text-orange-300 text-xs">{roleLabel}</div>
                </div>
              </div>
            </div>

            <ProNavFull variant={variant} lang={lang} />

            <div className="p-3 border-t border-white/10">
              <form action="/api/auth/signout" method="POST">
                <button type="submit" className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-white/60 hover:text-white hover:bg-white/10 text-sm font-medium transition-colors">
                  <LogOut size={18} /> {ui.logout}
                </button>
              </form>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
