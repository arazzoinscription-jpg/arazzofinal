import Link from "next/link";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { niveauxAutorises, voitEleve, type Espace } from "@/lib/espace/portee";
import { coursNiveaux } from "@/lib/live-care/load";
import { emailConfigure } from "@/lib/classe/commande";
import { lireReglages } from "@/lib/student-care/load";
import { DEBUT_TOUTES } from "@/lib/student-care/read";
import { dateCourte, dateHeure, estJourValide } from "@/lib/student-care/time";
import { chargerClasse, chargerClasseMembres } from "@/lib/classe/load";
import { groupesDeLespace } from "@/lib/classe/groupes";
import { LIBELLE_TEINTE, TEINTES, avatarSur, compterTeintes, initiales, lireFiltresClasse } from "@/lib/classe/vue";
import { STYLE_TEINTE } from "../teintes";
import { ClasseInteractive } from "../classe-interactive";
import { AjouterStory } from "@/components/stories/ajouter-story";
import { bandeauDe } from "@/app/formateur/groupes/carte-groupe";


type Params = Record<string, string | string[] | undefined>;
const un = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

function Cadre({ children }: { children: React.ReactNode }) {
  return <div className="px-4 lg:px-8 py-6 max-w-[1500px]">{children}</div>;
}

function Tableau({ titre, sousTitre, children, enseignante }: { titre: string; sousTitre: React.ReactNode; children?: React.ReactNode; enseignante?: { id: string; nom: string; avatar: string | null } | null }) {
  // Le « tableau noir » de la classe : titre, période, répartition.
  return (
    <header className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#2A0880] via-[#3f10c2] to-[#5B16F9] text-white px-5 sm:px-8 py-6 mb-5 shadow-lg">
      <div className="absolute -right-10 -top-10 w-48 h-48 rounded-full bg-white/10" aria-hidden />
      <div className="absolute right-24 -bottom-16 w-40 h-40 rounded-full bg-orange-400/20" aria-hidden />
      {enseignante ? (
        <Link href={`/communaute/u/${enseignante.id}`} title="Voir mon profil communauté" className="relative float-right ms-4 mb-2 flex flex-col items-center text-center hover:opacity-90">
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden ring-4 ring-white/40 bg-white/20 flex items-center justify-center font-playfair text-3xl font-bold">
            {enseignante.avatar
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={enseignante.avatar} alt={`Photo de ${enseignante.nom}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              : <span>{initiales(enseignante.nom)}</span>}
          </div>
          <div className="mt-1.5 text-xs text-white/80 max-w-[8rem] truncate">{enseignante.nom}</div>
        </Link>
      ) : null}
      {enseignante ? (
        <div className="relative float-right clear-right ms-4 -mt-1 mb-2"><AjouterStory sombre equipe /></div>
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

/** Ce que l'Espace de commande doit savoir : niveaux de l'espace, direct RÉELLEMENT en cours, service e-mail configuré. */
async function etatCommande(admin: ReturnType<typeof createAdminClient>, espace: Espace) {
  let niveaux: { id: string; code: "N1" | "N2" | "N3"; titre: string }[] = [];
  try {
    niveaux = niveauxAutorises(espace, await coursNiveaux(admin)).map((n) => ({ id: n.id, code: n.code, titre: n.titre }));
  } catch { niveaux = []; }
  const live = await admin.from("live_sessions").select("titre").eq("formateur_id", espace.userId).eq("is_live", true)
    .order("created_at", { ascending: false }).limit(1).maybeSingle();
  const direct = !live.error && live.data ? { titre: ((live.data as { titre: string | null }).titre ?? "Direct") } : null;
  return { niveaux, direct, serviceEmail: emailConfigure(process.env.RESEND_API_KEY) };
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

  const commande = await etatCommande(admin, espace);
  // TOUTES les élèves inscrites, quelle que soit la date de leur inscription (comme les annonces et la cloche).
  // « ?depuis=AAAA-MM-JJ » : seulement celles inscrites depuis ce jour (ex. la date de début du suivi).
  const depuisParam = un(searchParams.depuis);
  const filtreDate = estJourValide(depuisParam) ? depuisParam : null;
  const jourDebut = filtreDate ?? DEBUT_TOUTES;
  const lienDepuis = (jour: string | null) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(searchParams)) if (k !== "depuis" && typeof v === "string") p.set(k, v);
    if (jour) p.set("depuis", jour);
    const q = p.toString();
    return `${b}/classe${q ? `?${q}` : ""}`;
  };
  const dateSuivi = etat.reglages.start_date;

  const maintenant = new Date();
  // La photo de l'enseignante connectée, en haut (les élèves la voient aussi sur leur « Ma classe »).
  const { data: moi } = await admin.from("users").select("nom, avatar_url").eq("id", espace.userId).maybeSingle();
  const enseignante = moi ? { id: espace.userId, nom: (moi.nom as string | null) ?? "Enseignante", avatar: avatarSur(moi.avatar_url as string | null) } : null;
  // Groupes = classes : « ?groupe=<id> » montre la classe d'un groupe (créatrice ou administration).
  const groupes = await groupesDeLespace(admin, espace);
  const groupeDemande = un(searchParams.groupe);
  const groupe = groupeDemande ? groupes.find((g) => g.id === groupeDemande) ?? null : null;
  const garder = (e: { formations: { course_id: string }[] }) => voitEleve(espace, e.formations);
  const classe = groupe
    ? await chargerClasseMembres(admin, groupe.membres, { seuils: etat.reglages.seuils, maintenant, garder })
    : await chargerClasse(admin, { jourDebut, seuils: etat.reglages.seuils, maintenant, garder });
  const total = compterTeintes(classe.cartes);
  const seuils = etat.reglages.seuils;

  return (
    <Cadre>
      <Tableau
        titre={groupe ? groupe.nom : "Ma classe"}
        enseignante={enseignante}
        sousTitre={<>
          {groupe
            ? <>Classe du groupe · {classe.cartes.length} élève{classe.cartes.length > 1 ? "s" : ""} suivie{classe.cartes.length > 1 ? "s" : ""}</>
            : <>
                {classe.cartes.length} élève{classe.cartes.length > 1 ? "s" : ""} inscrite{classe.cartes.length > 1 ? "s" : ""}{espace.cours !== null ? " à vos cours" : ""}
                {filtreDate ? <> depuis le {dateCourte(`${filtreDate}T12:00:00Z`)} · <Link href={lienDepuis(null)} className="underline underline-offset-2 hover:text-white">voir toutes mes élèves</Link></>
                  : <> (toutes les inscriptions){dateSuivi ? <> · <Link href={lienDepuis(dateSuivi)} className="underline underline-offset-2 hover:text-white">seulement depuis le {dateCourte(`${dateSuivi}T12:00:00Z`)}</Link></> : null}</>}
              </>}
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

      <ClasseInteractive
        base={b}
        cartes={classe.cartes}
        initiaux={lireFiltresClasse(searchParams)}
        niveaux={commande.niveaux}
        groupes={groupes.map((g) => ({ id: g.id, nom: g.nom, membres: g.membres.length }))}
        groupeCourant={groupe?.id ?? null}
        direct={commande.direct}
        serviceEmail={commande.serviceEmail}
        milieu={<>
          {groupes.length > 0 ? (
            <nav aria-label="Classes par groupe" className="mb-4">
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-xs text-gray-500 font-semibold">Classes par groupe</span>
                <span className="flex gap-3 text-xs font-semibold">
                  {groupe ? <Link href={`/formateur/groupes/${groupe.id}`} className="text-orange-600 hover:underline">Gérer ce groupe →</Link> : null}
                  <Link href="/formateur/groupes" className="text-[#5B16F9] hover:underline">Tous les groupes →</Link>
                </span>
              </div>
              <ul className="flex gap-2 overflow-x-auto pb-1 snap-x sm:flex-wrap sm:overflow-visible">
                <li className="snap-start shrink-0">
                  <Link href={`${b}/classe`} aria-current={!groupe ? "page" : undefined}
                    className={`flex items-center gap-2.5 rounded-2xl border px-3 py-2 min-w-[150px] transition ${!groupe ? "bg-[#5B16F9] border-[#5B16F9] text-white shadow-sm" : "bg-white border-gray-200 text-gray-800 hover:border-[#5B16F9]/40 hover:shadow-sm"}`}>
                    <span className={`w-8 h-8 rounded-xl flex items-center justify-center text-base ${!groupe ? "bg-white/20" : "bg-[#5B16F9]/10"}`} aria-hidden>🏫</span>
                    <span className="leading-tight"><span className="block text-xs font-semibold">Toute la classe</span><span className={`block text-[11px] ${!groupe ? "text-white/80" : "text-gray-500"}`}>tous les groupes</span></span>
                  </Link>
                </li>
                {groupes.map((g) => {
                  const actif = groupe?.id === g.id;
                  return (
                    <li key={g.id} className="snap-start shrink-0">
                      <Link href={`${b}/classe?groupe=${g.id}`} aria-current={actif ? "page" : undefined}
                        className={`flex items-center gap-2.5 rounded-2xl border px-3 py-2 min-w-[150px] max-w-[230px] transition ${actif ? "bg-[#5B16F9] border-[#5B16F9] text-white shadow-sm" : "bg-white border-gray-200 text-gray-800 hover:border-[#5B16F9]/40 hover:shadow-sm"}`}>
                        <span className={`w-8 h-8 rounded-xl flex items-center justify-center font-playfair font-bold ${actif ? "bg-white/20" : "bg-gradient-to-br " + bandeauDe(g.id) + " text-white"}`} aria-hidden>{(g.nom.trim()[0] ?? "G").toUpperCase()}</span>
                        <span className="leading-tight min-w-0"><span className="block text-xs font-semibold truncate" title={g.nom}>{g.nom}</span><span className={`block text-[11px] ${actif ? "text-white/80" : "text-gray-500"}`}>{g.membres.length} membre{g.membres.length > 1 ? "s" : ""}</span></span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
          ) : null}
          {groupeDemande && !groupe ? (
            <div className="mb-3 rounded-xl px-4 py-2 text-sm border bg-amber-50 border-amber-200 text-amber-800">Ce groupe n&apos;existe pas ou ne fait pas partie de votre espace.</div>
          ) : null}

          {classe.suivi.avertissements.map((a) => (
            <div key={a} className={`mb-3 rounded-xl px-4 py-2 text-sm border ${classe.suivi.complet ? "bg-gray-50 border-gray-100 text-gray-600" : "bg-red-50 border-red-200 text-red-700 font-semibold"}`}>{a}</div>
          ))}
          {!classe.photos_lues ? (
            <div className="mb-3 rounded-xl px-4 py-2 text-sm border bg-gray-50 border-gray-100 text-gray-600">Photos de profil non lues : les initiales sont affichées à la place.</div>
          ) : null}
        </>}
        vide={(
          <div className="bg-white rounded-2xl border border-dashed border-gray-200 text-center py-14 text-gray-500">
            <div className="text-4xl mb-2" aria-hidden>🪑</div>
            {groupe ? "Aucune élève suivie dans ce groupe." : filtreDate ? <>Aucune élève inscrite depuis le {dateCourte(`${filtreDate}T12:00:00Z`)}.</> : "Aucune élève inscrite à vos cours pour le moment."}
          </div>
        )}
      />

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
          Les couleurs reflètent la <b>dernière activité pédagogique enregistrée</b>, pas la présence. Le <b className="text-emerald-700">point vert</b> sur la photo = élève en ligne en ce moment
          (une page Arazzo ouverte, sauf si elle a choisi le mode discrète), avec ce qu&apos;elle a indiqué faire : cours théorique, patronage, couture ou modèle en cours.
          Seuils réglables dans le <Link href={`${b}/suivi`} className="underline">suivi pédagogique</Link>.
        </p>
      </details>
    </Cadre>
  );
}
