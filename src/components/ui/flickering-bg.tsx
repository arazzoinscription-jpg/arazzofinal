import { FlickeringGrid } from "./flickering-grid-hero";

/**
 * Fond commun à grille scintillante (FlickeringGrid).
 * À placer comme 1er enfant d'un conteneur `relative` ; il se peint au-dessus
 * de la couleur de fond du parent mais derrière le contenu (gaps crème visibles).
 */
export function FlickeringBackground({ color = "#5B16F9" }: { color?: string }) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <FlickeringGrid
        squareSize={3}
        gridGap={16}
        flickerChance={0.1}
        maxOpacity={0.14}
        color={color}
        className="h-full w-full"
      />
    </div>
  );
}
