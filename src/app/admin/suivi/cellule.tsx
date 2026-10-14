import type { Cellule } from "@/lib/student-care/display";
import { STYLE_ETAT } from "@/lib/student-care/display";
import type { CodeAction, Statut } from "@/lib/student-care/rules";
import { LIBELLE_ACTION, LIBELLE_STATUT } from "@/lib/student-care/rules";

/** Une cellule qui dit toujours SI la donnée existe (voir display.ts). */
export function Val({ c, petit = false }: { c: Cellule; petit?: boolean }) {
  return (
    <span className={`${STYLE_ETAT[c.etat]} ${petit ? "text-xs" : "text-sm"}`} title={c.detail}>
      {c.texte}
      {c.detail && !petit ? <span className="block text-[11px] text-gray-400 not-italic leading-snug">{c.detail}</span> : null}
    </span>
  );
}

const COULEUR_ACTION: Record<CodeAction, string> = {
  verifier_blocage: "bg-red-100 text-red-700 border-red-200",
  contacter: "bg-orange-100 text-orange-700 border-orange-200",
  relancer: "bg-amber-100 text-amber-800 border-amber-200",
  accueillir: "bg-sky-100 text-sky-700 border-sky-200",
  feliciter: "bg-green-100 text-green-700 border-green-200",
  aucune: "bg-gray-50 text-gray-500 border-gray-200",
};

export function BadgeAction({ code }: { code: CodeAction }) {
  return (
    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold border ${COULEUR_ACTION[code]}`}>
      {LIBELLE_ACTION[code]}
    </span>
  );
}

const COULEUR_STATUT: Record<Statut, string> = {
  jamais_connectee: "bg-gray-100 text-gray-600",
  sans_activite: "bg-violet-100 text-violet-700",
  active: "bg-green-100 text-green-700",
  ralentie: "bg-yellow-100 text-yellow-800",
  inactive: "bg-red-50 text-red-700",
};

export function BadgeStatut({ statut }: { statut: Statut }) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${COULEUR_STATUT[statut]}`}>
      {LIBELLE_STATUT[statut]}
    </span>
  );
}

export function BadgeNiveau({ niveau }: { niveau: string }) {
  return <span className="inline-block px-1.5 py-0.5 rounded-md text-[11px] font-bold bg-[#5B16F9]/10 text-[#5B16F9]">{niveau}</span>;
}

export function Barre({ pct }: { pct: number | null }) {
  if (pct === null) return null;
  return (
    <div className="h-1.5 w-full max-w-[140px] rounded-full bg-gray-100 overflow-hidden mt-1" aria-hidden>
      <div className="h-full bg-orange-500" style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} />
    </div>
  );
}
