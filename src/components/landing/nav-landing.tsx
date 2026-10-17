"use client";

import { Navbar } from "@/components/layout/navbar";
import { MobileQuickNav } from "@/components/layout/mobile-quick-nav";

/**
 * Landings (offres, formations, packs, présentiel, cours gratuit, inscription) : LE MÊME MENU que le site
 * (barre du haut : logo, Formations, Patrons, Boutique, Offres, À propos, langue, panier, Mon espace),
 * avec la flèche « retour » toujours visible à côté du logo. La landing est une page plein écran : on réserve
 * la hauteur de la barre, et le bouton de langue de la landing passe juste en dessous.
 * Sur mobile : la barre du bas du site aussi (rendue DANS la landing, sinon le plein écran la cache).
 */
export function NavLanding() {
  return (
    <>
      <Navbar solid retourToujours />
      <div aria-hidden style={{ height: "calc(80px + env(safe-area-inset-top))" }} />
      <MobileQuickNav lampId="quicknav-landing" />
      {/* Langue de la landing sous le menu ; place pour la barre du bas ; panneau « Menu » opaque (fond violet plein écran). */}
      <style>{`.pl .pl-langue{top:calc(env(safe-area-inset-top) + 92px);z-index:40}
@media (max-width:639px){.pl{padding-bottom:calc(88px + env(safe-area-inset-bottom))}}
.pl nav .bg-white\\/95{background-color:#fff}
.dark .pl nav .bg-white\\/95{background-color:#15102b}`}</style>
    </>
  );
}
