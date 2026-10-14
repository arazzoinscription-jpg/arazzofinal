import Link from "next/link";
import { School, Settings2, Users } from "lucide-react";
import { LIBELLE_TEINTE, TEINTES, compterTeintes, type CarteEleve } from "@/lib/classe/vue";
import { Avatar } from "@/app/admin/classe/carte";
import { STYLE_TEINTE } from "@/app/admin/classe/teintes";
import { DeleteGroupButton } from "./delete-group-button";

/** Bandeaux de couleur (sans photo de couverture) : un par groupe, stable d'une visite à l'autre. */
export const BANDEAUX = [
  "from-[#2A0880] via-[#3f10c2] to-[#5B16F9]",
  "from-orange-500 via-orange-400 to-amber-300",
  "from-emerald-600 via-emerald-500 to-teal-400",
  "from-rose-500 via-pink-500 to-fuchsia-500",
  "from-sky-600 via-sky-500 to-cyan-400",
] as const;

export function bandeauDe(id: string): string {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return BANDEAUX[h % BANDEAUX.length];
}

const VISIBLES = 6;

/** Petite carte d'un groupe (= une classe) : qui en fait partie, où en sont-elles, et les deux actions. */
export function CarteGroupe({ g, membres, peutSupprimer }: {
  g: { id: string; nom: string; description: string | null; couverture: string | null; membres: string[] };
  /** Membres suivis dans l'espace (photo + couleur de suivi). */
  membres: CarteEleve[];
  peutSupprimer: boolean;
}) {
  const total = compterTeintes(membres);
  return (
    <article className="group w-full flex flex-col bg-white rounded-2xl border border-cream-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition overflow-hidden">
      <div className={`relative h-16 bg-gradient-to-br ${bandeauDe(g.id)}`}>
        {g.couverture ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={g.couverture} alt="" className="absolute inset-0 w-full h-full object-cover" />
        ) : null}
        <span className="absolute left-4 -bottom-5 w-11 h-11 rounded-xl bg-white shadow-md flex items-center justify-center font-playfair text-xl font-bold text-[#5B16F9]" aria-hidden>
          {(g.nom.trim()[0] ?? "G").toUpperCase()}
        </span>
        {peutSupprimer ? <span className="absolute top-2 right-2 rounded-lg bg-white/90 px-2 py-0.5 shadow-sm"><DeleteGroupButton id={g.id} /></span> : null}
      </div>

      <div className="flex-1 flex flex-col px-4 pt-7 pb-4">
        <h3 className="font-semibold text-gray-900 font-dm leading-tight line-clamp-1" title={g.nom}>{g.nom}</h3>
        <p className="text-xs text-gray-500 font-dm line-clamp-2 min-h-[2rem] mt-0.5">{g.description || "—"}</p>
        <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-gray-600 font-semibold">
          <Users size={13} aria-hidden /> {g.membres.length} membre{g.membres.length > 1 ? "s" : ""}
          {membres.length !== g.membres.length ? <span className="font-normal text-gray-400">· {membres.length} suivie{membres.length > 1 ? "s" : ""}</span> : null}
        </p>

        <div className="mt-3 flex items-center min-h-[2.5rem]">
          {membres.length ? (
            <div className="flex -space-x-2">
              {membres.slice(0, VISIBLES).map((c) => <Avatar key={c.id} c={c} taille="sm" />)}
            </div>
          ) : <span className="text-xs text-gray-400">Aucune élève suivie pour l&apos;instant.</span>}
          {membres.length > VISIBLES ? <span className="ms-2 text-xs text-gray-500 font-semibold">+{membres.length - VISIBLES}</span> : null}
        </div>

        {membres.length ? (
          <div className="mt-2 flex flex-wrap gap-1">
            {TEINTES.filter((t) => total[t] > 0).map((t) => (
              <span key={t} title={LIBELLE_TEINTE[t]} className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${STYLE_TEINTE[t].pastille}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${STYLE_TEINTE[t].point}`} aria-hidden />{total[t]}
              </span>
            ))}
          </div>
        ) : null}

        <div className="mt-auto pt-4 grid grid-cols-2 gap-2">
          <Link href={`/formateur/classe?groupe=${g.id}`} className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#5B16F9] text-white text-xs font-semibold px-3 py-2 hover:bg-[#4a10d0] transition">
            <School size={14} aria-hidden /> Classe
          </Link>
          <Link href={`/formateur/groupes/${g.id}`} className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-orange-DEFAULT text-white text-xs font-semibold px-3 py-2 hover:bg-orange-600 transition">
            <Settings2 size={14} aria-hidden /> Gérer
          </Link>
        </div>
      </div>
    </article>
  );
}
