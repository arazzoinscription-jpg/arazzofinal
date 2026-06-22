"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Plus, X, Clapperboard, Newspaper } from "lucide-react";

type Role = "eleve" | "formateur" | "patronniste" | "admin" | string;

/**
 * Bouton flottant « + » unifié pour publier dans la communauté.
 * Propose : Publier une vidéo (selon l'espace du rôle) + Publier une actualité.
 * Les vidéos sont réservées aux formateur/patronniste/admin (élève : actualité
 * seulement pour l'instant — la vidéo élève viendra plus tard).
 */
export function CommunityFab({ role }: { role: Role }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  // Destination « vidéo » selon le rôle (espace de publication dédié).
  const videoHref =
    role === "admin" ? "/admin/communaute"
    : role === "formateur" ? "/formateur/communaute"
    : role === "patronniste" ? "/patronniste/communaute"
    : null; // élève : pas encore

  const canVideo = videoHref !== null;

  return (
    <div ref={ref} className="fixed bottom-20 lg:bottom-8 end-5 z-40 flex flex-col items-end gap-2.5">
      {/* Options (au-dessus du bouton) */}
      {open && (
        <div className="flex flex-col items-end gap-2.5 mb-1">
          {canVideo && (
            <Link href={videoHref!} onClick={() => setOpen(false)}
              className="group inline-flex items-center gap-2.5 bg-white dark:bg-[#1a1330] text-violet-950 dark:text-white pl-4 pr-3 py-2.5 rounded-full shadow-lg ring-1 ring-violet-950/10 dark:ring-white/10 hover:bg-cream-50 transition-colors">
              <span className="text-sm font-semibold">Publier une vidéo</span>
              <span className="w-9 h-9 rounded-full bg-violet-600 text-white flex items-center justify-center"><Clapperboard size={17} /></span>
            </Link>
          )}
          <Link href="/dashboard/actualites" onClick={() => setOpen(false)}
            className="group inline-flex items-center gap-2.5 bg-white dark:bg-[#1a1330] text-violet-950 dark:text-white pl-4 pr-3 py-2.5 rounded-full shadow-lg ring-1 ring-violet-950/10 dark:ring-white/10 hover:bg-cream-50 transition-colors">
            <span className="text-sm font-semibold">Publier une actualité</span>
            <span className="w-9 h-9 rounded-full bg-orange-DEFAULT text-white flex items-center justify-center"><Newspaper size={17} /></span>
          </Link>
        </div>
      )}

      {/* Bouton + principal */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Fermer" : "Ajouter une publication"}
        aria-expanded={open}
        className={`w-14 h-14 rounded-full shadow-xl flex items-center justify-center text-white transition-all ${
          open ? "bg-violet-700 rotate-45" : "bg-orange-DEFAULT hover:bg-orange-600"
        }`}
      >
        {open ? <X size={24} /> : <Plus size={26} />}
      </button>
    </div>
  );
}
