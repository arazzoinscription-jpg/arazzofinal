"use client";

import { useEffect } from "react";
import { signalerErreur } from "@/lib/signaler-erreur";

/**
 * Filet de sécurité au niveau des pages (segment racine) : au lieu de l'écran brut
 * « exception côté client », l'utilisateur voit un message clair + bouton Recharger.
 * L'erreur est signalée au serveur (qui, quelle page, page traduite ou non) pour pouvoir la corriger.
 */
export default function Error({ error }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { signalerErreur(error); }, [error]);
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-2xl border border-cream-200 shadow-soft p-8 text-center">
        <div className="text-5xl mb-3">✂️</div>
        <h1 className="font-playfair text-2xl font-bold text-violet-950 mb-2">Une erreur s'est produite</h1>
        <p className="text-gray-500 font-dm mb-1">
          Un souci d'affichage est survenu. Rechargez la page — vos données ne sont pas perdues.
        </p>
        <p dir="rtl" lang="ar" className="text-gray-500 font-dm mb-6">حدث خلل في العرض. أعيدي تحميل الصفحة — بياناتك محفوظة.</p>
        {/* Rechargement COMPLET : reset() seul réaffiche la même erreur quand elle vient du serveur. */}
        <button
          onClick={() => location.reload()}
          className="bg-orange-DEFAULT text-white px-6 py-3 rounded-xl font-semibold hover:bg-orange-600 transition-colors"
        >
          Recharger · إعادة التحميل
        </button>
        {error?.digest || error?.message ? (
          <p className="mt-5 text-[10px] text-gray-300 font-mono break-all">{error.digest ?? String(error.message).slice(0, 90)}</p>
        ) : null}
      </div>
    </div>
  );
}
