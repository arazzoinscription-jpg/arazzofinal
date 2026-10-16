import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { espaceFormatrice, voitEleve } from "@/lib/espace/load";
import { groupesDeLespace } from "@/lib/classe/groupes";
import { chargerClasseMembres } from "@/lib/classe/load";
import { lireReglages } from "@/lib/student-care/load";
import { SEUILS_PAR_DEFAUT } from "@/lib/student-care/rules";
import type { CarteEleve } from "@/lib/classe/vue";
import { GroupCreateForm } from "./group-create-form";
import { CarteGroupe } from "./carte-groupe";

export const metadata = { title: "Groupes (classes) — Arazzo Formation" };
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

/** Groupes = classes : une petite carte par groupe (élèves, suivi, actions) ; création repliée en haut. */
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

  const suivies = new Set(groupes.flatMap((g) => g.membres.filter((id) => cartes.has(id))));
  // Inscriptions en ligne (migration 101) : lues si disponibles, sinon rien n'est affiché.
  const inscriptions = new Map<string, { ouverte: boolean; capacite: number | null }>();
  if (groupes.length) {
    const r = await admin.from("groups").select("id, inscription_ouverte, capacite").in("id", groupes.map((g) => g.id));
    if (!r.error) for (const x of (r.data ?? []) as { id: string; inscription_ouverte: boolean; capacite: number | null }[]) inscriptions.set(x.id, { ouverte: x.inscription_ouverte, capacite: x.capacite });
  }

  return (
    <div>
      <header className="mb-5 flex flex-col sm:flex-row sm:items-end gap-3">
        <div className="flex-1 min-w-0">
          <h1 className="font-playfair text-3xl font-bold text-gray-900">Groupes (classes)</h1>
          <p className="text-gray-500 mt-1 font-dm text-sm">
            Chaque groupe est une classe : « Classe » montre ses élèves et leur suivi ; « Gérer » ouvre ses publications, ses membres et son WhatsApp.
          </p>
          {!suiviLu ? <p className="text-xs text-amber-700 mt-1">Suivi des membres indisponible pour le moment : les photos et couleurs ne sont pas affichées.</p> : null}
        </div>
        <div className="flex gap-2 text-xs font-semibold">
          <span className="rounded-full bg-white border border-cream-200 px-3 py-1.5 text-gray-700">{groupes.length} groupe{groupes.length > 1 ? "s" : ""}</span>
          <span className="rounded-full bg-white border border-cream-200 px-3 py-1.5 text-gray-700">{suivies.size} élève{suivies.size > 1 ? "s" : ""} suivie{suivies.size > 1 ? "s" : ""}</span>
        </div>
      </header>

      {/* Création repliée par défaut : la page montre d'abord les groupes. Ouverte d'office s'il n'y en a aucun. */}
      <details className="mb-6 group/creer" open={!groupes.length}>
        <summary className="list-none inline-flex items-center gap-2 cursor-pointer rounded-xl bg-[#5B16F9] text-white text-sm font-semibold px-4 py-2 hover:bg-[#4a10d0] transition">
          <Plus size={16} className="transition group-open/creer:rotate-45" aria-hidden /> Nouveau groupe
        </summary>
        <div className="mt-3 max-w-xl"><GroupCreateForm /></div>
      </details>

      {!groupes.length ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-cream-200">
          <div className="text-5xl mb-3" aria-hidden>👥</div>
          <p className="text-gray-500 font-dm">Aucun groupe pour le moment : créez le premier ci-dessus.</p>
        </div>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
          {groupes.map((g) => (
            <li key={g.id} className="flex">
              <CarteGroupe
                g={g}
                membres={g.membres.map((id) => cartes.get(id)).filter((c): c is CarteEleve => Boolean(c))}
                peutSupprimer={espace.estAdmin || g.creatrice === espace.userId}
                inscription={inscriptions.get(g.id) ?? null}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
