"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

/**
 * « Retour » : revient à la page d'où l'on vient (feed, Ma classe…) au lieu d'AJOUTER une page
 * à l'historique — l'ancien lien « Retour au feed » créait une boucle avec la flèche du feed.
 * Sans page précédente du site (lien ouvert dans un nouvel onglet), on REMPLACE par le feed.
 */
export function BoutonRetour({ repli = "/communaute", className, children }: { repli?: string; className?: string; children?: React.ReactNode }) {
  const router = useRouter();
  function retour() {
    let depuisLeSite = false;
    try { depuisLeSite = window.history.length > 1 && (!document.referrer || new URL(document.referrer).origin === window.location.origin); } catch { depuisLeSite = false; }
    if (depuisLeSite) router.back();
    else router.replace(repli);
  }
  return (
    <button type="button" onClick={retour} className={className}>
      <ArrowLeft size={16} className="rtl:rotate-180" aria-hidden /> {children ?? "Retour"}
    </button>
  );
}
