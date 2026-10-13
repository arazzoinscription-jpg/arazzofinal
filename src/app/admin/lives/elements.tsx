import Link from "next/link";
import type { LiveComplet } from "@/lib/live-care/donnees";
import { LIBELLE_STATUT_LIVE, statutLive, type StatutLive } from "@/lib/live-care/statuts";
import { etatRappel, fenetreCronExistant } from "@/lib/live-care/rappels";
import { NIVEAU_PAR_COURS } from "@/lib/student-care/levels";
import { dateLongue, heureCourte } from "@/lib/live-care/temps";

const COULEUR: Record<StatutLive, string> = {
  a_venir: "bg-sky-100 text-sky-700",
  en_cours: "bg-red-100 text-red-700",
  passe: "bg-gray-100 text-gray-500",
  annule: "bg-gray-200 text-gray-500 line-through",
};

export function BadgeStatutLive({ statut }: { statut: StatutLive }) {
  return <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${COULEUR[statut]}`}>{LIBELLE_STATUT_LIVE[statut]}</span>;
}

export function Niveaux({ cours, audience }: { cours: string[]; audience?: string | null }) {
  // Directs « Passer en direct » privés : ni global, ni par niveau.
  if (audience === "group") return <span className="px-1.5 py-0.5 rounded-md text-[11px] font-bold bg-amber-100 text-amber-800">Direct privé · groupe</span>;
  if (audience === "link") return <span className="px-1.5 py-0.5 rounded-md text-[11px] font-bold bg-amber-100 text-amber-800">Direct privé · lien secret</span>;
  if (!cours.length) return <span className="text-xs text-gray-500">Toutes les élèves (global)</span>;
  return (
    <span className="inline-flex flex-wrap gap-1">
      {cours.map((c) => <span key={c} className="px-1.5 py-0.5 rounded-md text-[11px] font-bold bg-[#5B16F9]/10 text-[#5B16F9]">{NIVEAU_PAR_COURS.get(c) ?? "autre cours"}</span>)}
    </span>
  );
}

/** Résumé des rappels d'un live : jamais « envoyé » sans confirmation. */
export function ResumeRappels({ l, maintenant }: { l: LiveComplet; maintenant: Date }) {
  const etats = l.rappels.map((r) => etatRappel(r, maintenant).code);
  const n = (c: string) => etats.filter((e) => e === c).length;
  if (!l.rappels.length) {
    // Lives créés hors de ce module : le cron existant (J-1 / H-1, 08:00 UTC) peut les rappeler — ce n'est pas un envoi confirmé.
    const cron = fenetreCronExistant(l.live.starts_at);
    if (l.live.created_via !== "admin_lives" && (cron.veille || cron.heure)) return <span className="text-xs text-gray-500">Rappels du système existant possibles ({[cron.veille ? "J-1" : "", cron.heure ? "H-1" : ""].filter(Boolean).join(" / ")})</span>;
    return <span className="text-xs text-gray-400">Aucun rappel</span>;
  }
  return (
    <span className="text-xs text-gray-600">
      {n("prevu")} prévu(s){n("envoye") ? ` · ${n("envoye")} envoyé(s) confirmé(s)` : ""}{n("echu_non_envoye") ? ` · ${n("echu_non_envoye")} échu(s) non envoyé(s)` : ""}{n("annule") ? ` · ${n("annule")} annulé(s)` : ""}
    </span>
  );
}

export function ListeLives({ lives, maintenant }: { lives: LiveComplet[]; maintenant: Date }) {
  if (!lives.length) return <div className="bg-white rounded-2xl border border-gray-100 text-center py-12 text-gray-500">Aucun live sur cette période.</div>;
  return (
    <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
      {lives.map((l) => {
        const st = statutLive(l.live, maintenant);
        return (
          <Link key={l.live.id} href={`/admin/lives/${l.live.id}`} className={`flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 hover:bg-gray-50 ${st === "annule" ? "opacity-60" : ""}`}>
            <div className="w-44 shrink-0">
              <div className="text-sm font-semibold text-gray-900 capitalize">{dateLongue(l.live.starts_at)}</div>
              <div className="text-xs text-gray-500">{heureCourte(l.live.starts_at)} (Alger) · {l.live.duree_minutes ?? "?"} min</div>
            </div>
            <div className="flex-1 min-w-[180px]">
              <div className={`text-sm font-medium text-gray-900 ${st === "annule" ? "line-through" : ""}`}>{l.live.titre}</div>
              <div className="flex flex-wrap items-center gap-2 mt-0.5">
                <Niveaux cours={l.cours} audience={l.live.audience} />
                {l.serie ? <span className="text-[11px] text-gray-500">↻ série hebdomadaire</span> : null}
                {l.live.created_via !== "admin_lives" ? <span className="text-[11px] text-gray-400">créé par la formatrice (/formateur/sessions)</span> : null}
              </div>
            </div>
            <div className="w-56"><ResumeRappels l={l} maintenant={maintenant} /></div>
            <BadgeStatutLive statut={st} />
          </Link>
        );
      })}
    </div>
  );
}
