import Link from "next/link";
import { ArrowLeft, Radio, ExternalLink } from "lucide-react";
import type { ActiveLive } from "@/lib/live";

/** Vue de visionnage d'un direct (embed YouTube/Facebook 16:9 + badge EN DIRECT). */
export function LiveView({ live, backHref }: { live: ActiveLive | null; backHref: string }) {
  return (
    <div className="min-h-[100dvh] bg-[#0b0818] text-white">
      <div className="max-w-4xl mx-auto px-4 pt-[max(16px,env(safe-area-inset-top))] pb-16">
        <Link href={backHref} className="inline-flex items-center gap-1.5 text-white/70 hover:text-white text-sm mb-5">
          <ArrowLeft size={16} /> Retour
        </Link>

        {!live || (!live.embedSrc && !live.externalUrl) ? (
          <div className="text-center py-24">
            <div className="text-5xl mb-3">📺</div>
            <p className="text-white/60 font-dm text-lg">Aucun direct en ce moment.</p>
            <p className="text-white/40 font-dm text-sm mt-1">Revenez quand la formatrice sera en direct.</p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 mb-3">
              <span className="inline-flex items-center gap-1.5 bg-red-600 text-white text-xs font-bold px-2.5 py-1 rounded-full animate-pulse">
                <Radio size={13} /> EN DIRECT
              </span>
              <span className="text-sm text-white/60 font-dm">avec {live.formateurName}</span>
            </div>
            <h1 className="font-playfair text-2xl sm:text-3xl font-bold mb-4">{live.titre}</h1>

            {live.embedSrc ? (
              <div className="relative w-full rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-black" style={{ aspectRatio: "16 / 9" }}>
                <iframe
                  src={live.embedSrc}
                  title={live.titre}
                  allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                  allowFullScreen
                  className="absolute inset-0 w-full h-full"
                />
              </div>
            ) : (
              // TikTok / Instagram : pas d'embed de live possible → bouton d'ouverture.
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-8 text-center">
                <p className="text-white/70 font-dm mb-5">
                  Le direct a lieu sur <strong>{live.platform}</strong>. Touchez le bouton pour le regarder.
                </p>
                <a href={live.externalUrl!} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold px-6 py-3.5 rounded-2xl shadow-lg transition-colors">
                  <Radio size={18} /> Regarder sur {live.platform} <ExternalLink size={16} />
                </a>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
