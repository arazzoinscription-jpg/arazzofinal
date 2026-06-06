"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { GraduationCap, Shapes, Loader2, Check, X, Clock } from "lucide-react";
import { requestRole } from "./actions";

type Role = "formateur" | "patronniste";
type Status = "none" | "en_attente" | "approuve" | "refuse";

export function RoleRequestCTA({
  formateurStatus, patronnisteStatus,
}: {
  formateurStatus: Status;
  patronnisteStatus: Status;
}) {
  return (
    <div className="rounded-3xl bg-gradient-to-br from-violet-600 to-violet-800 dark:from-violet-700 dark:to-violet-900 p-6 sm:p-7 text-white">
      <h2 className="font-playfair text-2xl font-bold">Évoluez sur Arazzo ✨</h2>
      <p className="text-white/80 text-sm mt-1 mb-5 max-w-xl">
        Partagez votre savoir-faire : devenez <strong>formatrice</strong> pour enseigner, ou <strong>patronniste</strong> pour publier et vendre vos patrons.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <RoleCard
          role="formateur"
          title="Devenir formatrice"
          desc="Créez des cours, des quiz et animez des sessions live."
          icon={GraduationCap}
          status={formateurStatus}
        />
        <RoleCard
          role="patronniste"
          title="Devenir patronniste"
          desc="Publiez vos patrons, gérez les fichiers et les commandes."
          icon={Shapes}
          status={patronnisteStatus}
        />
      </div>
    </div>
  );
}

function RoleCard({
  role, title, desc, icon: Icon, status,
}: {
  role: Role; title: string; desc: string; icon: typeof GraduationCap; status: Status;
}) {
  const [pending, start] = useTransition();
  const [state, setState] = useState<Status>(status);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function submit() {
    setError(null);
    start(async () => {
      const res = await requestRole(role);
      if (res.ok) { setState("en_attente"); router.refresh(); }
      else setError(res.error || "Erreur");
    });
  }

  return (
    <div className="rounded-2xl bg-white/10 backdrop-blur-sm border border-white/15 p-4 flex flex-col">
      <div className="flex items-center gap-2.5 mb-1.5">
        <span className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center"><Icon size={18} /></span>
        <h3 className="font-semibold">{title}</h3>
      </div>
      <p className="text-white/70 text-xs mb-4 flex-1">{desc}</p>

      {state === "approuve" ? (
        <span className="inline-flex items-center gap-2 text-sm font-medium text-green-200"><Check size={16} /> Demande approuvée</span>
      ) : state === "en_attente" ? (
        <span className="inline-flex items-center gap-2 text-sm font-medium text-orange-200"><Clock size={16} /> Demande en attente</span>
      ) : (
        <>
          {state === "refuse" && (
            <span className="inline-flex items-center gap-1.5 text-xs text-white/60 mb-2"><X size={13} /> Demande précédente refusée</span>
          )}
          <button
            onClick={submit}
            disabled={pending}
            className="inline-flex items-center justify-center gap-2 bg-orange-DEFAULT hover:bg-orange-600 disabled:opacity-60 text-white font-semibold px-4 py-2.5 rounded-xl transition-colors text-sm"
          >
            {pending ? <Loader2 size={16} className="animate-spin" /> : <Icon size={16} />}
            {state === "refuse" ? "Refaire la demande" : "Faire la demande"}
          </button>
        </>
      )}
      {error && <p className="text-xs text-red-200 mt-2">{error}</p>}
    </div>
  );
}
