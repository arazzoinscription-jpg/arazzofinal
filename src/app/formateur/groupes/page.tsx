import Link from "next/link";
import { redirect } from "next/navigation";
import { School } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { espaceFormatrice, voitEleve } from "@/lib/espace/load";
import { groupesDeLespace } from "@/lib/classe/groupes";
import { chargerClasseMembres } from "@/lib/classe/load";
import { lireReglages } from "@/lib/student-care/load";
import { SEUILS_PAR_DEFAUT } from "@/lib/student-care/rules";
import { LIBELLE_TEINTE, TEINTES, compterTeintes, type CarteEleve } from "@/lib/classe/vue";
import { Avatar } from "@/app/admin/classe/carte";
import { STYLE_TEINTE } from "@/app/admin/classe/teintes";
import { GroupCreateForm } from "./group-create-form";
import { DeleteGroupButton } from "./delete-group-button";

export const metadata = { title: "Groupes (classes) — Arazzo Formation" };
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

const VISIBLES = 10;

/** Groupes = classes : chaque groupe s'affiche avec ses élèves (photo + couleur de suivi) et s'ouvre en classe. */
export default async function FormateurGroupesPage() {
  const espace = await espaceFormatrice();
  if (!espace) redirect("/dashboard");

  const admin = createAdminClient();
  const groupes = await groupesDeLespace(admin, espace);

  // Une seule lecture du suivi pour tous les membres de tous les groupes.
  const reglages = await lireReglages(admin);
  const seuils = reglages.ok ? reglages.reglages.seuils : SEUILS_PAR_DEFAUT;
  const tous = [...new Set(groupes.flatMap((g) => g.membres))];
  let cartes = new Map<string, CarteEleve>();
  let suiviLu = true;
  if (tous.length) {
    try {
      const c = await chargerClasseMembres(admin, tous, { seuils, maintenant: new Date(), garder: (e) => voitEleve(espace, e.formations) });
      cartes = new Map(c.cartes.map((x) => [x.id, x]));
    } catch { suiviLu = false; }
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-playfair text-3xl font-bold text-gray-900">Groupes (classes)</h1>
        <p className="text-gray-500 mt-1 font-dm">
          Chaque groupe est une classe : ouvrez-la pour voir ses élèves, leur progression et leur suivi. Publications, membres et WhatsApp se gèrent dans « Gérer & publier ».
        </p>
        {!suiviLu ? <p className="text-xs text-amber-700 mt-1">Suivi des membres indisponible pour le moment : les photos et couleurs ne sont pas affichées.</p> : null}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <GroupCreateForm />
        </div>

        <div className="lg:col-span-2 space-y-4">
          {!groupes.length ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-cream-200">
              <div className="text-5xl mb-3">👥</div>
              <p className="text-gray-400 font-dm">Aucun groupe pour le moment.</p>
            </div>
          ) : groupes.map((g) => {
            const membres = g.membres.map((id) => cartes.get(id)).filter((c): c is CarteEleve => Boolean(c));
            const total = compterTeintes(membres);
            return (
              <div key={g.id} className="bg-white rounded-2xl border border-cream-200 overflow-hidden">
                {g.couverture ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={g.couverture} alt="" className="w-full h-28 object-cover" />
                ) : <div className="h-2 bg-gradient-to-r from-[#2A0880] via-[#3f10c2] to-[#5B16F9]" />}
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-gray-900 font-dm text-lg">{g.nom}</h3>
                      {g.description ? <p className="text-sm text-gray-500 font-dm line-clamp-2 mt-0.5">{g.description}</p> : null}
                      <p className="text-xs text-gray-400 font-dm mt-1">👤 {g.membres.length} membre(s){membres.length !== g.membres.length ? ` · ${membres.length} suivie(s) dans votre classe` : ""}</p>
                    </div>
                    {(espace.estAdmin || g.creatrice === espace.userId) ? <DeleteGroupButton id={g.id} /> : null}
                  </div>

                  {membres.length ? (
                    <div className="mt-4 flex flex-wrap items-center gap-2.5">
                      {membres.slice(0, VISIBLES).map((c) => <Avatar key={c.id} c={c} taille="sm" />)}
                      {membres.length > VISIBLES ? <span className="text-xs text-gray-500 font-semibold">+{membres.length - VISIBLES}</span> : null}
                    </div>
                  ) : null}
                  {membres.length ? (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {TEINTES.filter((t) => total[t] > 0).map((t) => (
                        <span key={t} className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${STYLE_TEINTE[t].pastille}`}>
                          <span className={`w-2 h-2 rounded-full ${STYLE_TEINTE[t].point}`} aria-hidden />{total[t]} · {LIBELLE_TEINTE[t]}
                        </span>
                      ))}
                    </div>
                  ) : null}

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link href={`/formateur/classe?groupe=${g.id}`}
                      className="inline-flex items-center gap-1.5 bg-[#5B16F9] text-white text-sm px-4 py-1.5 rounded-lg font-semibold hover:bg-[#4a10d0] transition-colors">
                      <School size={15} /> Voir la classe →
                    </Link>
                    <Link href={`/formateur/groupes/${g.id}`}
                      className="inline-block bg-orange-DEFAULT text-white text-sm px-4 py-1.5 rounded-lg font-semibold hover:bg-orange-600 transition-colors">
                      Gérer & publier →
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
