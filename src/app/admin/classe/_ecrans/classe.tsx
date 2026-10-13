import Link from "next/link";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { voitEleve, type Espace } from "@/lib/espace/portee";
import { lireReglages } from "@/lib/student-care/load";
import { dateCourte, dateHeure, estJourValide } from "@/lib/student-care/time";
import { chargerClasse } from "@/lib/classe/load";
import { LIBELLE_TEINTE, TEINTES, avatarSur, compterTeintes, initiales, lireFiltresClasse } from "@/lib/classe/vue";
import { STYLE_TEINTE } from "../teintes";
import { BarreCommande } from "../commandes";
import { GrilleClasse } from "../grille";


type Params = Record<string, string | string[] | undefined>;
const un = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

function Cadre({ children }: { children: React.ReactNode }) {
  return <div className="px-4 lg:px-8 py-6 max-w-[1500px]">{children}</div>;
}

function Tableau({ titre, sousTitre, children, enseignante }: { titre: string; sousTitre: React.ReactNode; children?: React.ReactNode; enseignante?: { nom: string; avatar: string | null } | null }) {
  // Le « tableau noir » de la classe : titre, période, répartition.
  return (
    <header className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#2A0880] via-[#3f10c2] to-[#5B16F9] text-white px-5 sm:px-8 py-6 mb-5 shadow-lg">
      <div className="absolute -right-10 -top-10 w-48 h-48 rounded-full bg-white/10" aria-hidden />
      <div className="absolute right-24 -bottom-16 w-40 h-40 rounded-full bg-orange-400/20" aria-hidden />
      {enseignante ? (
        <div className="relative float-right ms-4 mb-2 flex flex-col items-center text-center">
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden ring-4 ring-white/40 bg-white/20 flex items-center justify-center font-playfair text-3xl font-bold">
            {enseignante.avatar
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={enseignante.avatar} alt={`Photo de ${enseignante.nom}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              : <span>{initiales(enseignante.nom)}</span>}
          </div>
          <div className="mt-1.5 text-xs text-white/80 max-w-[8rem] truncate">{enseignante.nom}</div>
        </div>
      ) : null}
      <div className="relative">
        <p className="text-xs uppercase tracking-[0.2em] text-white/70 font-dm">Arazzo · Classe virtuelle</p>
        <h1 className="font-playfair text-3xl sm:text-4xl font-bold mt-1">{titre}</h1>
        <div className="text-sm text-white/80 font-dm mt-1">{sousTitre}</div>
        {children}
      </div>
    </header>
  );
}

/** « Ma classe » — administration (toutes les élèves) ou formatrice (élèves de ses cours). */
export async function EcranClasse({ espace, searchParams }: { espace: Espace; searchParams: Params }) {
  const b = espace.base;

  const admin = createAdminClient();
  const etat = await lireReglages(admin);
  if (!etat.ok) {
    return (
      <Cadre>
        <Tableau titre="Ma classe" sousTitre="Indisponible sur cette base." />
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-sm text-amber-900">
          « Ma classe » s&apos;appuie sur le suivi pédagogique, dont la migration <code>095_student_care.sql</code> n&apos;est pas appliquée sur cette base.
          <div className="mt-2 text-xs text-amber-700">Détail technique : {etat.message}</div>
        </div>
      </Cadre>
    );
  }

  const depuisParam = un(searchParams.depuis);
  const jourDebut = estJourValide(depuisParam) ? depuisParam : etat.reglages.start_date;
  if (!jourDebut) {
    return (
      <Cadre>
        <Tableau titre="Ma classe" sousTitre="Choisissez d'abord la date de début de suivi." />
        <BarreCommande base={b} />
        <div className="bg-white rounded-2xl border border-dashed border-gray-200 text-center py-12 text-gray-600">
          La classe regroupe les élèves inscrites depuis la date de suivi.{" "}
          <Link href={`${b}/suivi`} className="text-[#5B16F9] font-semibold hover:underline">Choisir la date dans le suivi pédagogique →</Link>
        </div>
      </Cadre>
    );
  }

  const maintenant = new Date();
  // La photo de l'enseignante connectée, en haut (les élèves la voient aussi sur leur « Ma classe »).
  const { data: moi } = await admin.from("users").select("nom, avatar_url").eq("id", espace.userId).maybeSingle();
  const enseignante = moi ? { nom: (moi.nom as string | null) ?? "Enseignante", avatar: avatarSur(moi.avatar_url as string | null) } : null;
  const classe = await chargerClasse(admin, { jourDebut, seuils: etat.reglages.seuils, maintenant, garder: (e) => voitEleve(espace, e.formations) });
  const total = compterTeintes(classe.cartes);
  const seuils = etat.reglages.seuils;

  return (
    <Cadre>
      <Tableau
        titre="Ma classe"
        enseignante={enseignante}
        sousTitre={<>
          {classe.cartes.length} élève{classe.cartes.length > 1 ? "s" : ""} inscrite{classe.cartes.length > 1 ? "s" : ""}{espace.cours !== null ? " à vos cours" : ""} depuis le {dateCourte(`${jourDebut}T12:00:00Z`)}
          <span className="text-white/60"> · données du {dateHeure(classe.suivi.calcule_le)} (Alger)</span>
        </>}
      >
        <div className="mt-4 flex flex-wrap gap-1.5 sm:gap-2">
          {TEINTES.filter((t) => total[t] > 0).map((t) => (
            <span key={t} className="inline-flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur px-2.5 sm:px-3 py-0.5 sm:py-1 text-[11px] sm:text-xs font-semibold">
              <span className={`w-2.5 h-2.5 rounded-full ${STYLE_TEINTE[t].point}`} aria-hidden />
              {total[t]} · {LIBELLE_TEINTE[t]}
            </span>
          ))}
        </div>
      </Tableau>

      <BarreCommande base={b} />

      {classe.suivi.avertissements.map((a) => (
        <div key={a} className={`mb-3 rounded-xl px-4 py-2 text-sm border ${classe.suivi.complet ? "bg-gray-50 border-gray-100 text-gray-600" : "bg-red-50 border-red-200 text-red-700 font-semibold"}`}>{a}</div>
      ))}
      {!classe.photos_lues ? (
        <div className="mb-3 rounded-xl px-4 py-2 text-sm border bg-gray-50 border-gray-100 text-gray-600">Photos de profil non lues : les initiales sont affichées à la place.</div>
      ) : null}

      {classe.cartes.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-gray-200 text-center py-14 text-gray-500">
          <div className="text-4xl mb-2" aria-hidden>🪑</div>
          Aucune élève inscrite depuis le {dateCourte(`${jourDebut}T12:00:00Z`)}.
        </div>
      ) : (
        <GrilleClasse base={b} cartes={classe.cartes} initiaux={lireFiltresClasse(searchParams)} />
      )}

      <details className="mt-6 bg-white rounded-2xl border border-gray-100 p-4 text-sm text-gray-600">
        <summary className="cursor-pointer font-semibold text-gray-800">Comment lire les couleurs ?</summary>
        <ul className="mt-3 space-y-1.5">
          <li><b className="text-emerald-700">Vert</b> : leçon terminée, quiz ou travail pratique depuis moins de {seuils.active_jours} jours.</li>
          <li><b className="text-amber-700">Jaune</b> : dernière activité entre {seuils.active_jours} et {seuils.inactive_jours} jours.</li>
          <li><b className="text-red-700">Rouge</b> : plus de {seuils.inactive_jours} jours sans activité pédagogique — une intervention est recommandée.</li>
          <li><b className="text-violet-700">Violet</b> : se connecte mais n&apos;a encore jamais progressé (aucune leçon, aucun quiz, aucun travail).</li>
          <li><b className="text-slate-600">Gris</b> : ne s&apos;est jamais connectée.</li>
          <li><b className="text-gray-500">Pointillés</b> : données indisponibles (inscription importée de l&apos;ancien système, historique antérieur non enregistré).</li>
        </ul>
        <p className="mt-3 text-xs text-gray-500">
          Les couleurs reflètent la <b>dernière activité pédagogique enregistrée</b>, pas une présence en ligne : le site ne sait pas qui est connectée en ce moment.
          Seuils réglables dans le <Link href={`${b}/suivi`} className="underline">suivi pédagogique</Link>.
        </p>
      </details>
    </Cadre>
  );
}
