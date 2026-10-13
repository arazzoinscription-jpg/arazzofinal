/** Écran d'attente du feed : réaction IMMÉDIATE au clic, le temps que les vidéos se chargent. */
export default function Loading() {
  return (
    <div className="fixed inset-0 bg-[#0b0818] text-white flex flex-col items-center justify-center gap-4" aria-busy="true" aria-label="Chargement du feed">
      <div className="w-12 h-12 rounded-full border-4 border-white/15 border-t-orange-400 animate-spin" />
      <p className="text-sm text-white/60 font-dm">Chargement du feed…</p>
    </div>
  );
}
