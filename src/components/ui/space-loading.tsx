/**
 * Squelette de chargement générique pour les espaces (élève / formateur /
 * patronniste). Rendu INSTANTANÉMENT par les fichiers `loading.tsx` pendant que
 * la page serveur se charge → le changement d'espace paraît immédiat au lieu de
 * « figer » sur l'ancienne page (surtout sur mobile / réseau lent).
 */
export function SpaceLoading({ title = "Chargement…" }: { title?: string }) {
  return (
    <div className="animate-pulse space-y-5" aria-busy="true" aria-label={title}>
      {/* En-tête */}
      <div className="space-y-2">
        <div className="h-7 w-48 rounded-lg bg-black/10 dark:bg-white/10" />
        <div className="h-4 w-72 max-w-full rounded bg-black/5 dark:bg-white/5" />
      </div>
      {/* Bandeau */}
      <div className="h-28 rounded-2xl bg-black/[0.06] dark:bg-white/[0.06]" />
      {/* Grille de cartes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-40 rounded-2xl bg-black/[0.06] dark:bg-white/[0.06]" />
        ))}
      </div>
    </div>
  );
}
