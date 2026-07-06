"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { ChevronLeft } from "lucide-react";

// Pages « racines » de chaque espace : on n'y affiche PAS de retour (on y est déjà
// au niveau le plus haut → le menu principal suffit).
const ROOTS = new Set(["/", "/dashboard", "/admin", "/formateur", "/communaute", "/boutique"]);

/**
 * Bouton « Retour » visible UNIQUEMENT quand l'app tourne en mode PWA installée
 * (standalone) — là où il n'y a pas de barre de navigation du navigateur. En
 * onglet web classique, le bouton retour natif existe déjà → on n'affiche rien.
 */
export function PwaBackButton() {
  const router = useRouter();
  const pathname = usePathname();
  const [standalone, setStandalone] = useState(false);
  const [canGoBack, setCanGoBack] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(display-mode: standalone)");
    const update = () =>
      setStandalone(mq.matches || (window.navigator as any).standalone === true);
    update();
    mq.addEventListener?.("change", update);
    return () => mq.removeEventListener?.("change", update);
  }, []);

  useEffect(() => {
    // Historique disponible ET on n'est pas sur une page racine.
    setCanGoBack(window.history.length > 1 && !ROOTS.has(pathname));
  }, [pathname]);

  if (!standalone || !canGoBack) return null;

  return (
    <button
      type="button"
      onClick={() => router.back()}
      aria-label="Revenir en arrière"
      className="shrink-0 grid place-items-center w-10 h-10 rounded-xl text-violet-800 dark:text-white/90 hover:bg-violet-50 dark:hover:bg-white/10 active:scale-95 transition"
    >
      <ChevronLeft size={24} className="rtl:rotate-180" />
    </button>
  );
}
