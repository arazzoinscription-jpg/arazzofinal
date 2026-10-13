/** Écran d'attente du profil : s'affiche AU CLIC (depuis le feed), le temps que le profil se charge. */
export default function Loading() {
  return (
    <div className="min-h-[100dvh] bg-[#0b0818] text-white" aria-busy="true" aria-label="Chargement du profil">
      <div className="max-w-3xl mx-auto px-4 pt-[max(16px,env(safe-area-inset-top))] pb-24 animate-pulse">
        <div className="h-4 w-28 rounded bg-white/10 mb-8" />
        <div className="flex flex-col items-center text-center">
          <div className="w-24 h-24 rounded-full bg-white/10" />
          <div className="h-6 w-44 rounded bg-white/10 mt-4" />
          <div className="h-3 w-24 rounded bg-white/10 mt-2" />
          <div className="flex gap-8 mt-6">
            {[0, 1, 2, 3].map((i) => <div key={i} className="h-10 w-12 rounded bg-white/10" />)}
          </div>
        </div>
        <div className="h-28 rounded-2xl bg-white/5 mt-8" />
        <div className="grid grid-cols-3 gap-1.5 mt-10">
          {Array.from({ length: 9 }).map((_, i) => <div key={i} className="aspect-[9/16] rounded bg-white/5" />)}
        </div>
      </div>
    </div>
  );
}
