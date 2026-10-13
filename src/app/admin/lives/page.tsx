import Link from "next/link";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { adminConnecte } from "@/lib/student-care/guard";
import { etatMigration, lireLivesPeriode } from "@/lib/live-care/load";
import { statutLive } from "@/lib/live-care/statuts";
import { etatRappel } from "@/lib/live-care/rappels";
import { ajouterJours, estMoisValide, jourAlger, moisVoisin } from "@/lib/live-care/temps";
import { minuitAlgerIso } from "@/lib/student-care/time";
import { CalendrierLives } from "./calendrier";
import { ListeLives } from "./elements";

export const metadata = { title: "Lives pédagogiques — Admin" };
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

type Params = Record<string, string | string[] | undefined>;
const un = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export default async function LivesPage({ searchParams }: { searchParams: Params }) {
  if (!(await adminConnecte())) redirect("/dashboard");
  const admin = createAdminClient();
  const absente = await etatMigration(admin);
  if (absente) {
    return (
      <div className="px-4 lg:px-8 py-6 max-w-3xl">
        <h1 className="font-playfair text-3xl font-bold text-gray-900 mb-3">Lives pédagogiques</h1>
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-sm text-amber-900">
          Module indisponible : la migration <code>096_lives_pedagogiques.sql</code> n&apos;est pas appliquée sur cette base.
          <div className="mt-2 text-xs text-amber-700">Détail technique : {absente}</div>
        </div>
      </div>
    );
  }

  const maintenant = new Date();
  const aujourdhui = jourAlger(maintenant);
  const vue = un(searchParams.vue) === "calendrier" ? "calendrier" : "liste";
  const mois = estMoisValide(un(searchParams.mois)) ? un(searchParams.mois) : aujourdhui.slice(0, 7);
  const ok = un(searchParams.ok);
  const erreur = un(searchParams.erreur);

  // Liste : d'hier à +120 jours. Calendrier : le mois affiché.
  const [de, a] = vue === "calendrier"
    ? [minuitAlgerIso(`${mois}-01`), minuitAlgerIso(`${moisVoisin(mois, 1)}-01`)]
    : [minuitAlgerIso(ajouterJours(aujourdhui, -1)), minuitAlgerIso(ajouterJours(aujourdhui, 120))];
  const { lives, complet } = await lireLivesPeriode(admin, de, a);

  const dans7 = new Date(maintenant.getTime() + 7 * 86_400_000).getTime();
  const aVenir = lives.filter((l) => statutLive(l.live, maintenant) === "a_venir");
  const compteurs = [
    { libelle: "Lives dans les 7 jours", n: aVenir.filter((l) => new Date(l.live.starts_at).getTime() <= dans7).length },
    { libelle: vue === "calendrier" ? "Lives à venir ce mois" : "Lives à venir (120 j)", n: aVenir.length },
    { libelle: "Annulés", n: lives.filter((l) => l.live.cancelled_at).length },
    { libelle: "Séries hebdomadaires", n: new Set(lives.filter((l) => l.serie && !l.serie.cancelled_at).map((l) => l.serie!.id)).size },
    { libelle: "Rappels planifiés à venir", n: lives.flatMap((l) => l.rappels).filter((r) => etatRappel(r, maintenant).code === "prevu").length },
  ];

  return (
    <div className="px-4 lg:px-8 py-6">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <h1 className="font-playfair text-3xl font-bold text-gray-900 mb-1">Lives pédagogiques</h1>
          <p className="text-gray-500 font-dm text-sm">Un seul calendrier : celui des sessions live du site. Heures d&apos;Alger. Aucun rappel n&apos;est envoyé dans cette version.</p>
        </div>
        <Link href="/admin/lives/nouveau" className="bg-orange-600 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-orange-700">+ Programmer un live</Link>
      </div>

      {ok ? <div className="mb-4 rounded-xl bg-green-50 border border-green-100 px-4 py-2 text-sm text-green-800">{ok}</div> : null}
      {erreur ? <div className="mb-4 rounded-xl bg-red-50 border border-red-100 px-4 py-2 text-sm text-red-700">{erreur}</div> : null}
      {!complet ? <div className="mb-4 rounded-xl bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-700 font-semibold">Lecture incomplète : la liste n&apos;est pas exhaustive.</div> : null}

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-5">
        {compteurs.map((c) => (
          <div key={c.libelle} className="rounded-2xl border border-gray-100 bg-white px-4 py-3">
            <div className="text-2xl font-bold font-playfair text-gray-900">{c.n}</div>
            <div className="text-xs text-gray-500 leading-tight">{c.libelle}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-2 mb-4 text-sm">
        <Link href="/admin/lives" className={`px-4 py-2 rounded-xl border ${vue === "liste" ? "bg-[#5B16F9] text-white border-[#5B16F9]" : "bg-white border-gray-200"}`}>Liste</Link>
        <Link href={`/admin/lives?vue=calendrier&mois=${mois}`} className={`px-4 py-2 rounded-xl border ${vue === "calendrier" ? "bg-[#5B16F9] text-white border-[#5B16F9]" : "bg-white border-gray-200"}`}>Calendrier</Link>
      </div>

      {vue === "calendrier"
        ? <CalendrierLives mois={mois} lives={lives} aujourdhui={aujourdhui} maintenant={maintenant} />
        : <ListeLives lives={lives} maintenant={maintenant} />}
    </div>
  );
}
