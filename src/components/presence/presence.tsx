"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Présence « en ligne » des enseignantes — Supabase Realtime Presence (temps réel, AUCUNE écriture en base).
 *  - L'enseignante (espace formatrice ou administration ouvert) SIGNALE sa présence ;
 *  - l'élève (page « Ma classe ») ÉCOUTE seulement : sa propre présence n'est jamais diffusée.
 * « En ligne » = l'enseignante a son espace Arazzo ouvert en ce moment. Rien n'est inventé :
 * tant que l'état n'est pas connu, on affiche « … », et « indisponible » si le temps réel échoue.
 */
export const CANAL_PRESENCE = "arazzo-enseignantes-en-ligne";

/** Côté enseignante : à monter dans les espaces formatrice et administration. */
export function SignalPresence({ userId }: { userId: string }) {
  useEffect(() => {
    const supabase = createClient();
    // `enabled: true` : sans écoute « presence » sur ce canal, la présence n'est activée qu'explicitement.
    const canal = supabase.channel(CANAL_PRESENCE, { config: { presence: { key: userId, enabled: true } } });
    canal.subscribe(async (statut) => {
      if (statut === "SUBSCRIBED") await canal.track({ en_ligne_depuis: new Date().toISOString() });
    });
    return () => {
      void canal.untrack();
      void supabase.removeChannel(canal);
    };
  }, [userId]);
  return null;
}

export type EtatPresence = "connexion" | "en_ligne" | "hors_ligne" | "indisponible";

/** Côté élève : renvoie l'état de présence d'une enseignante (par identifiant). */
export function useEnseignantesEnLigne(): (id: string) => EtatPresence {
  const [pret, setPret] = useState(false);
  const [erreur, setErreur] = useState(false);
  const [enLigne, setEnLigne] = useState<Set<string>>(new Set());
  useEffect(() => {
    const supabase = createClient();
    const canal = supabase.channel(CANAL_PRESENCE);
    canal
      .on("presence", { event: "sync" }, () => setEnLigne(new Set(Object.keys(canal.presenceState()))))
      .subscribe((statut) => {
        if (statut === "SUBSCRIBED") { setPret(true); setErreur(false); }
        if (statut === "CHANNEL_ERROR" || statut === "TIMED_OUT") setErreur(true);
      });
    return () => { void supabase.removeChannel(canal); };
  }, []);
  return (id: string) => (erreur ? "indisponible" : !pret ? "connexion" : enLigne.has(id) ? "en_ligne" : "hors_ligne");
}

const STYLE: Record<EtatPresence, { texte: string; classe: string; point: string }> = {
  en_ligne: { texte: "En ligne", classe: "bg-emerald-50 text-emerald-700 border-emerald-200", point: "bg-emerald-500 animate-pulse" },
  hors_ligne: { texte: "Hors ligne", classe: "bg-gray-50 text-gray-500 border-gray-200", point: "bg-gray-300" },
  connexion: { texte: "…", classe: "bg-gray-50 text-gray-400 border-gray-100", point: "bg-gray-200" },
  indisponible: { texte: "Présence indisponible", classe: "bg-amber-50 text-amber-700 border-amber-200", point: "bg-amber-300" },
};

export function PastillePresence({ etat }: { etat: EtatPresence }) {
  const s = STYLE[etat];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${s.classe}`} title="En ligne = l'enseignante a son espace Arazzo ouvert en ce moment.">
      <span className={`w-2 h-2 rounded-full ${s.point}`} aria-hidden />{s.texte}
    </span>
  );
}
