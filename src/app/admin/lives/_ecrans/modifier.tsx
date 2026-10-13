import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { voitCours, voitLive, type Espace } from "@/lib/espace/portee";
import { coursNiveaux, etatMigration, jourEtHeure, lireLive } from "@/lib/live-care/load";
import { statutLive } from "@/lib/live-care/statuts";
import { modifierLiveAction } from "../actions";
import { FormulaireLive } from "../formulaire";


const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Modifier un live — seulement s'il est dans l'espace ; niveaux proposés : ceux de l'espace + ceux déjà sur le live. */
export async function EcranModifierLive({ espace, params, searchParams }: { espace: Espace; params: { id: string }; searchParams: Record<string, string | string[] | undefined> }) {
  const b = espace.base;
  if (!UUID.test(params.id)) notFound();
  const admin = createAdminClient();
  if (await etatMigration(admin)) redirect(`${b}/lives`);
  const l = await lireLive(admin, params.id);
  if (!l || !voitLive(espace, l.live, l.cours)) notFound();
  if (statutLive(l.live, new Date()) !== "a_venir") redirect(`${b}/lives/${l.live.id}?erreur=${encodeURIComponent("Seul un live à venir et non annulé peut être modifié.")}`);
  const niveaux = (await coursNiveaux(admin)).filter((n) => voitCours(espace, n.id) || l.cours.includes(n.id));
  const { jour, heure } = jourEtHeure(l.live.starts_at);
  const erreur = Array.isArray(searchParams.erreur) ? searchParams.erreur[0] : searchParams.erreur;
  return (
    <div className="px-4 lg:px-8 py-6 max-w-3xl">
      <Link href={`${b}/lives/${l.live.id}`} className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-3"><ArrowLeft size={15} /> Retour au live</Link>
      <h1 className="font-playfair text-3xl font-bold text-gray-900 mb-4">Modifier le live</h1>
      {erreur ? <div className="mb-4 rounded-xl bg-red-50 border border-red-100 px-4 py-2 text-sm text-red-700">{erreur}</div> : null}
      <FormulaireLive
        base={b}
        action={modifierLiveAction}
        niveaux={niveaux}
        mode="modifier"
        serie={l.serie ? { date_debut: l.serie.date_debut, date_fin: l.serie.date_fin } : null}
        valeurs={{
          id: l.live.id, titre: l.live.titre, description: l.live.description ?? "", jour, heure,
          duree_minutes: l.live.duree_minutes ?? 60, lien: l.live.meet_url ?? "", course_ids: l.cours,
          recurrence: l.serie ? "hebdo" : "unique", jour_fin: l.serie?.date_fin ?? "", rappels: l.live.rappels ?? [],
        }}
      />
    </div>
  );
}
