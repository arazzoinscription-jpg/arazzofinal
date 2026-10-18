"use client";

import { useState, useTransition } from "react";
import { Clapperboard } from "lucide-react";
import { reglerNotifCour } from "@/app/actions/cour-notifications";

/**
 * « Notifications de La Cour » : être prévenue quand quelqu'un publie une story ou une vidéo (au plus une
 * notification toutes les 3 h). Les notifications importantes (cours, cloche, messages) ne changent pas.
 */
export function ReglageNotifCour({ initial }: { initial: boolean }) {
  const [actif, setActif] = useState(initial);
  const [message, setMessage] = useState<string | null>(null);
  const [envoi, demarrer] = useTransition();

  function basculer() {
    const suivant = !actif;
    setActif(suivant);
    setMessage(null);
    demarrer(async () => {
      const r = await reglerNotifCour(suivant);
      if (!r.ok) { setActif(!suivant); setMessage(r.erreur); return; }
      setMessage(suivant ? "Activées ✓" : "Coupées ✓");
    });
  }

  return (
    <div className="mb-6 rounded-3xl bg-white dark:bg-white/[0.04] ring-1 ring-violet-950/[0.07] dark:ring-white/10 p-5 flex items-start gap-4">
      <span className="w-11 h-11 shrink-0 rounded-2xl bg-teal-500/15 text-teal-600 dark:text-teal-300 grid place-items-center" aria-hidden><Clapperboard size={20} /></span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold">Notifications de La Cour</p>
        <p className="text-sm text-violet-950/60 dark:text-white/55 mt-0.5">
          Être prévenue quand quelqu’un publie une story ou une vidéo (au plus une notification toutes les 3 heures).
          Les notifications des cours, de la cloche et des messages ne changent pas.
        </p>
        {message ? <p className="text-xs mt-1.5 text-violet-950/70 dark:text-white/70">{message}</p> : null}
      </div>
      <button type="button" role="switch" aria-checked={actif} aria-label="Notifications de La Cour" onClick={basculer} disabled={envoi}
        className={`relative shrink-0 w-12 h-7 rounded-full transition-colors disabled:opacity-60 ${actif ? "bg-teal-600" : "bg-gray-300 dark:bg-white/20"}`}>
        <span className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-all ${actif ? "start-[1.4rem]" : "start-0.5"}`} />
      </button>
    </div>
  );
}
