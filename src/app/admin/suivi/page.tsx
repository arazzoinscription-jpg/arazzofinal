import Link from "next/link";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { adminConnecte } from "@/lib/student-care/guard";
import { chargerSuivi, lireReglages } from "@/lib/student-care/load";
import { compter, filtrer, lireFiltres, trier, type Filtres } from "@/lib/student-care/rules";
import { dateCourte, dateHeure, estJourValide } from "@/lib/student-care/time";
import { ReglagesSuivi } from "./reglages";
import { FiltresSuivi } from "./filtres";
import { TableauSuivi } from "./tableau";
import { DonneesEtLimites } from "./limites";

export const metadata = { title: "Suivi pédagogique — Admin" };
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

const PAR_PAGE = 50;

type Params = Record<string, string | string[] | undefined>;
const un = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

const ERREURS: Record<string, string> = {
  date: "Date de début invalide.",
  seuil: "Chaque seuil doit être un nombre entier de jours entre 1 et 365.",
  ordre: "Les seuils doivent respecter : activité récente ≤ inactive ≤ contact personnel.",
  enregistrement: "L'enregistrement a échoué. Rien n'a été modifié.",
};

/** Adresse de la page avec des filtres remplacés (les autres paramètres sont gardés). */
function lien(sp: Params, changement: Record<string, string | null>) {
  const valeurs: Record<string, string> = {};
  for (const k of ["depuis", "q", "niveau", "statut", "vue", "action", "tri"]) {
    const v = un(sp[k]);
    if (v) valeurs[k] = v;
  }
  for (const [k, v] of Object.entries(changement)) {
    if (v === null) delete valeurs[k]; else valeurs[k] = v;
  }
  const s = new URLSearchParams(valeurs).toString();
  return `/admin/suivi${s ? `?${s}` : ""}`;
}

function Compteur({ libelle, n, href, actif, ton }: { libelle: string; n: number; href: string; actif: boolean; ton: string }) {
  return (
    <Link href={href} className={`rounded-2xl border px-4 py-3 bg-white hover:shadow-sm transition ${actif ? "border-orange-400 ring-2 ring-orange-200" : "border-gray-100"}`}>
      <div className={`text-2xl font-bold font-playfair ${ton}`}>{n}</div>
      <div className="text-xs text-gray-500 font-dm leading-tight">{libelle}</div>
    </Link>
  );
}

function MigrationAbsente({ message }: { message: string }) {
  return (
    <div className="px-4 lg:px-8 py-6 max-w-3xl">
      <h1 className="font-playfair text-3xl font-bold text-gray-900 mb-3">Suivi pédagogique</h1>
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-sm text-amber-900">
        Le tableau n&apos;est pas encore disponible : la migration <code>095_student_care.sql</code> n&apos;est pas appliquée sur cette base.
        <div className="mt-2 text-xs text-amber-700">Détail technique : {message}</div>
      </div>
    </div>
  );
}

export default async function SuiviPedagogiquePage({ searchParams }: { searchParams: Params }) {
  if (!(await adminConnecte())) redirect("/dashboard");

  const admin = createAdminClient();
  const etat = await lireReglages(admin);
  if (!etat.ok) return <MigrationAbsente message={etat.message} />;

  const depuisParam = un(searchParams.depuis);
  const depuis = estJourValide(depuisParam) ? depuisParam : null;
  const jourDebut = depuis ?? etat.reglages.start_date;
  const erreur = ERREURS[un(searchParams.erreur)] ?? null;
  const enregistre = un(searchParams.enregistre) === "1";

  const entete = (
    <>
      <h1 className="font-playfair text-3xl font-bold text-gray-900 mb-1">Suivi pédagogique</h1>
      <p className="text-gray-500 mb-4 font-dm text-sm">
        Élèves inscrites depuis la date choisie, leur progression réelle et les situations qui demandent une intervention.
        Lecture seule : rien n&apos;est envoyé depuis cette page.
      </p>
      {erreur ? <div className="mb-4 rounded-xl bg-red-50 border border-red-100 px-4 py-2 text-sm text-red-700">{erreur}</div> : null}
      {enregistre ? <div className="mb-4 rounded-xl bg-green-50 border border-green-100 px-4 py-2 text-sm text-green-700">Réglages enregistrés.</div> : null}
    </>
  );

  if (!jourDebut) {
    return (
      <div className="px-4 lg:px-8 py-6">
        {entete}
        <ReglagesSuivi startDate={null} seuils={etat.reglages.seuils} majLe={etat.reglages.updated_at} ouvert />
        <div className="bg-white rounded-2xl border border-gray-100 text-center py-12 text-gray-500">
          Choisissez une date de début de suivi pour afficher les élèves.
        </div>
      </div>
    );
  }

  const maintenant = new Date();
  const res = await chargerSuivi(admin, { jourDebut, seuils: etat.reglages.seuils, maintenant });
  const f: Filtres = lireFiltres(searchParams);
  const c = compter(res.eleves);
  const liste = trier(filtrer(res.eleves, f), f.tri);
  const pages = Math.max(1, Math.ceil(liste.length / PAR_PAGE));
  const page = Math.min(pages, Math.max(1, Number.parseInt(un(searchParams.page), 10) || 1));
  const visibles = liste.slice((page - 1) * PAR_PAGE, page * PAR_PAGE);
  const base = lien(searchParams, {});
  const pageLien = (n: number) => `${base}${base.includes("?") ? "&" : "?"}page=${n}`;

  const sp = searchParams;
  const statut = un(sp.statut);
  const vue = un(sp.vue);

  return (
    <div className="px-4 lg:px-8 py-6">
      {entete}

      <div className="flex flex-wrap items-center gap-2 mb-4 text-sm">
        <span className="rounded-full bg-[#5B16F9]/10 text-[#5B16F9] px-3 py-1 font-semibold">
          Suivi depuis le {dateCourte(`${jourDebut}T12:00:00Z`)}
        </span>
        {depuis && depuis !== etat.reglages.start_date ? (
          <span className="text-xs text-gray-500">(date ponctuelle — <Link className="underline" href="/admin/suivi">revenir à la date enregistrée</Link>)</span>
        ) : null}
        <span className="text-xs text-gray-400">Données calculées le {dateHeure(res.calcule_le)} (heure d&apos;Alger)</span>
      </div>

      {res.avertissements.map((a) => (
        <div key={a} className={`mb-3 rounded-xl px-4 py-2 text-sm border ${res.complet ? "bg-gray-50 border-gray-100 text-gray-600" : "bg-red-50 border-red-200 text-red-700 font-semibold"}`}>{a}</div>
      ))}

      <ReglagesSuivi startDate={etat.reglages.start_date} seuils={etat.reglages.seuils} majLe={etat.reglages.updated_at} ouvert={false} />

      <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-3 mb-6">
        <Compteur libelle="Élèves suivies" n={c.total} href={lien(sp, { statut: null, vue: null })} actif={!statut && !vue} ton="text-gray-900" />
        <Compteur libelle="Jamais connectées" n={c.par_statut.jamais_connectee} href={lien(sp, { statut: "jamais_connectee", vue: null })} actif={statut === "jamais_connectee"} ton="text-gray-600" />
        <Compteur libelle="Connectées sans activité réelle" n={c.par_statut.sans_activite} href={lien(sp, { statut: "sans_activite", vue: null })} actif={statut === "sans_activite"} ton="text-violet-700" />
        <Compteur libelle="Actives" n={c.par_statut.active} href={lien(sp, { statut: "active", vue: null })} actif={statut === "active"} ton="text-green-700" />
        <Compteur libelle="En retard ou bloquées" n={c.retard} href={lien(sp, { vue: "retard", statut: null })} actif={vue === "retard"} ton="text-red-600" />
        <Compteur libelle="Étape terminée" n={c.etape} href={lien(sp, { vue: "etape", statut: null })} actif={vue === "etape"} ton="text-green-700" />
        <Compteur libelle="Travaux à corriger" n={c.a_corriger} href={lien(sp, { vue: "a_corriger", statut: null })} actif={vue === "a_corriger"} ton="text-orange-600" />
        <Compteur libelle="Travaux à refaire" n={c.a_refaire} href={lien(sp, { vue: "a_refaire", statut: null })} actif={vue === "a_refaire"} ton="text-amber-700" />
      </div>

      <FiltresSuivi f={f} depuis={depuis} />

      <p className="text-xs text-gray-500 mb-2">
        {liste.length} élève(s) affichée(s) sur {c.total} suivie(s) · ralenties : {c.par_statut.ralentie} · inactives : {c.par_statut.inactive}
        {" "}· N1 : {c.par_niveau.N1} · N2 : {c.par_niveau.N2} · N3 : {c.par_niveau.N3} · niveau non identifié : {c.par_niveau.aucun}
      </p>

      <TableauSuivi eleves={visibles} maintenantIso={res.calcule_le} depuis={depuis} />

      {pages > 1 ? (
        <nav className="flex items-center justify-center gap-3 mt-4 text-sm" aria-label="Pages">
          {page > 1 ? <Link className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white" href={pageLien(page - 1)}>← Précédente</Link> : null}
          <span className="text-gray-500">Page {page} / {pages}</span>
          {page < pages ? <Link className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white" href={pageLien(page + 1)}>Suivante →</Link> : null}
        </nav>
      ) : null}

      <DonneesEtLimites />
    </div>
  );
}
