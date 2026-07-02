"use client";

/**
 * Filet de sécurité au niveau des pages (segment racine) : au lieu de l'écran brut
 * « exception côté client », l'utilisateur voit un message clair + bouton Recharger.
 */
export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-2xl border border-cream-200 shadow-soft p-8 text-center">
        <div className="text-5xl mb-3">✂️</div>
        <h1 className="font-playfair text-2xl font-bold text-violet-950 mb-2">Une erreur s'est produite</h1>
        <p className="text-gray-500 font-dm mb-6">
          Un souci d'affichage est survenu. Rechargez la page — vos données ne sont pas perdues.
        </p>
        <button
          onClick={() => { try { reset(); } catch { location.reload(); } }}
          className="bg-orange-DEFAULT text-white px-6 py-3 rounded-xl font-semibold hover:bg-orange-600 transition-colors"
        >
          Recharger
        </button>
      </div>
    </div>
  );
}
