import { CheckCircle2, CircleDashed, Loader2, OctagonX, TriangleAlert } from "lucide-react";
import { LIBELLE_ETAPE, type EtapeEnvoi } from "@/lib/classe/commande";

const SUITE: EtapeEnvoi[] = ["prepare", "declenche", "confirme"];
const COURT: Record<EtapeEnvoi, string> = {
  prepare: "Préparé", declenche: "Déclenché", confirme: "Confirmé par le service",
  partiel: "Partiel", echec: "Échec", bloque: "Bloqué",
};

/** Où en est un envoi : préparé → déclenché → confirmé (ou bloqué / échec / partiel). Jamais « envoyé » sans réponse du service. */
export function Etapes({ etape, detail }: { etape: EtapeEnvoi | null; detail?: string | null }) {
  if (!etape) return null;
  const finale = !SUITE.includes(etape);
  const rang = finale ? (etape === "partiel" ? 2 : 1) : SUITE.indexOf(etape);
  const ton = etape === "confirme" ? "border-emerald-200 bg-emerald-50 text-emerald-800"
    : etape === "bloque" || etape === "echec" ? "border-red-200 bg-red-50 text-red-800"
    : etape === "partiel" ? "border-amber-200 bg-amber-50 text-amber-900"
    : "border-gray-200 bg-gray-50 text-gray-700";
  const Icone = etape === "confirme" ? CheckCircle2 : etape === "declenche" ? Loader2 : etape === "bloque" || etape === "echec" ? OctagonX : etape === "partiel" ? TriangleAlert : CircleDashed;
  return (
    <div role="status" aria-live="polite" className={`rounded-xl border px-3 py-2 text-sm ${ton}`}>
      <ol className="flex flex-wrap items-center gap-1 text-[11px] font-semibold mb-1" aria-label="Étapes de l'envoi">
        {SUITE.map((s, i) => (
          <li key={s} className={`rounded-full px-2 py-0.5 ${i <= rang && !(finale && i === rang && etape !== "partiel") ? "bg-black/10" : "opacity-50"}`}>
            {i + 1}. {COURT[s]}
          </li>
        ))}
        {finale ? <li className="rounded-full px-2 py-0.5 bg-black/15">→ {COURT[etape]}</li> : null}
      </ol>
      <div className="flex items-start gap-1.5">
        <Icone size={16} className={`mt-0.5 flex-shrink-0 ${etape === "declenche" ? "animate-spin" : ""}`} aria-hidden />
        <span><b>{LIBELLE_ETAPE[etape]}</b>{detail ? <> — {detail}</> : null}</span>
      </div>
    </div>
  );
}
