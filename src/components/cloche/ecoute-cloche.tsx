"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Bell, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { jouerCloche } from "./son-cloche";

export const EVENEMENT_CLOCHE = "arazzo:cloche";

/**
 * Côté élève : quand l'enseignante fait sonner la cloche, une bannière apparaît et une cloche sonne.
 * Trois sources (une seule sonnerie grâce à l'anti-doublon de 15 s) :
 *  - le push du téléphone (le service worker prévient la page ouverte) ;
 *  - la notification enregistrée (temps réel), si le push n'est pas activé ;
 *  - l'événement « arazzo:cloche » (aperçu dans l'Espace de commande).
 * App fermée : c'est la notification du téléphone (vibration de cloche) qui prend le relais.
 */
export function EcouteCloche({ userId }: { userId: string | null }) {
  const [cloche, setCloche] = useState<{ titre: string } | null>(null);
  const [sonBloque, setSonBloque] = useState(false);
  const dernier = useRef(0);

  const sonner = useCallback(async (titre: string) => {
    const t = Date.now();
    if (t - dernier.current < 15_000) return;
    dernier.current = t;
    setCloche({ titre });
    try { navigator.vibrate?.([500, 200, 500, 200, 900]); } catch { /* pas de vibreur */ }
    setSonBloque(!(await jouerCloche(3)));
  }, []);

  useEffect(() => {
    const surEvenement = (e: Event) => { void sonner((e as CustomEvent<{ titre?: string }>).detail?.titre ?? "🔔 La cloche sonne !"); };
    window.addEventListener(EVENEMENT_CLOCHE, surEvenement);
    const surMessage = (e: MessageEvent) => {
      const d = e.data as { type?: string; title?: string } | null;
      if (d?.type === "cloche") void sonner(d.title ?? "🔔 La cloche sonne !");
    };
    navigator.serviceWorker?.addEventListener?.("message", surMessage);
    return () => {
      window.removeEventListener(EVENEMENT_CLOCHE, surEvenement);
      navigator.serviceWorker?.removeEventListener?.("message", surMessage);
    };
  }, [sonner]);

  // Notifications « cloche » enregistrées pour cette élève (temps réel).
  useEffect(() => {
    if (!userId) return;
    const supabase = createClient();
    const canal = supabase.channel(`cloche:${userId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` }, (p) => {
        const n = p.new as { type?: string; title?: string };
        if (n?.type === "cloche") void sonner(n.title ?? "🔔 La cloche sonne !");
      })
      .subscribe();
    return () => { void supabase.removeChannel(canal); };
  }, [userId, sonner]);

  if (!cloche) return null;
  return (
    <div role="alert" className="fixed z-[70] top-[max(12px,env(safe-area-inset-top))] inset-x-3 sm:inset-x-auto sm:start-1/2 sm:-translate-x-1/2 sm:w-[420px] rounded-3xl bg-gradient-to-br from-[#5B16F9] to-[#FE7223] text-white shadow-2xl p-4">
      <style>{"@keyframes az-cloche{0%,100%{transform:rotate(0)}15%{transform:rotate(18deg)}30%{transform:rotate(-16deg)}45%{transform:rotate(12deg)}60%{transform:rotate(-8deg)}75%{transform:rotate(4deg)}}.az-cloche{animation:az-cloche 1.05s ease-in-out 3;transform-origin:50% 8%}@media (prefers-reduced-motion:reduce){.az-cloche{animation:none}}"}</style>
      <div className="flex items-start gap-3">
        <span className="az-cloche w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0" aria-hidden><Bell size={26} /></span>
        <div className="flex-1 min-w-0">
          <p className="text-xs uppercase tracking-wide text-white/80 font-semibold">Cloche de la classe</p>
          <p className="font-playfair text-lg font-bold leading-tight">{cloche.titre}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Link href="/dashboard/classe" onClick={() => setCloche(null)} className="rounded-xl bg-white text-[#2A0880] px-3 py-1.5 text-xs font-semibold">Aller à Ma classe</Link>
            {sonBloque ? (
              <button type="button" onClick={() => { void jouerCloche(3).then((ok) => setSonBloque(!ok)); }} className="rounded-xl border border-white/50 px-3 py-1.5 text-xs font-semibold">🔔 Écouter la cloche</button>
            ) : null}
          </div>
        </div>
        <button type="button" onClick={() => setCloche(null)} aria-label="Fermer" className="p-1 rounded-full hover:bg-white/10"><X size={18} /></button>
      </div>
    </div>
  );
}
