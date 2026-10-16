"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { GraduationCap, X } from "lucide-react";
import { doitInviter } from "@/lib/visiteuses/regles";

const CLE = "arazzo:invitation-classe-fermee";

/**
 * Mission 5 : après quelques gestes sur le feed (j'aime, commentaires, abonnements, réponses aux stories),
 * une visiteuse est invitée à rejoindre une classe. Refermée, l'invitation revient au plus tôt 3 jours après.
 */
export function InvitationClasse({ gestes, rejoindre }: { gestes: number; rejoindre: { titre: string; href: string } }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    let fermee: number | null = null;
    try { fermee = Number(localStorage.getItem(CLE)) || null; } catch { /* stockage indisponible */ }
    // Un court délai : jamais par-dessus l'ouverture du feed.
    const t = window.setTimeout(() => setVisible(doitInviter(gestes, fermee, Date.now())), 6000);
    return () => window.clearTimeout(t);
  }, [gestes]);

  if (!visible) return null;
  function fermer() {
    setVisible(false);
    try { localStorage.setItem(CLE, String(Date.now())); } catch { /* stockage indisponible */ }
  }

  return (
    <div role="status" className="fixed z-40 inset-x-3 sm:inset-x-auto sm:start-1/2 sm:-translate-x-1/2 sm:w-[420px] bottom-[calc(env(safe-area-inset-bottom)+76px)] rounded-2xl bg-[#140f2b]/95 backdrop-blur border border-white/15 text-white shadow-2xl p-3 flex items-center gap-3">
      <span className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#5B16F9] to-[#FE7223] grid place-items-center shrink-0"><GraduationCap size={22} aria-hidden /></span>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold leading-tight">Vous aimez la couture ? Rejoignez une classe !</div>
        <div className="text-xs text-white/70">Publiez sans attendre, avec votre enseignante et vos camarades.</div>
        <Link href={rejoindre.href} onClick={fermer} className="mt-1 inline-block text-xs font-bold text-orange-300 underline underline-offset-2">Voir la formation {rejoindre.titre}</Link>
      </div>
      <button type="button" onClick={fermer} aria-label="Fermer l'invitation" className="p-1 rounded-full hover:bg-white/10 self-start"><X size={16} /></button>
    </div>
  );
}
