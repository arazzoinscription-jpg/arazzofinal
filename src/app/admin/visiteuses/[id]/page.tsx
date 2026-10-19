import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, GraduationCap, Mail, MessageCircle, Monitor, Phone, Smartphone, UserRound } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { dateHeure } from "@/lib/student-care/time";
import { avatarSur } from "@/lib/classe/vue";
import { chargerProfilVisiteuse } from "@/lib/visiteuses/annuaire-load";
import { telephoneInternational } from "@/lib/visiteuses/annuaire";
import { estDansLaCour, libellePage } from "@/lib/statistiques-visites";
import { fmtDuree, SOURCE_COURTE } from "../../statistiques/qui-est-venu";

export const metadata = { title: "Fiche visiteuse — Admin" };
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const bouton = "inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-semibold transition";

function Panneau({ titre, children, className = "" }: { titre: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`min-w-0 bg-white rounded-2xl border border-gray-100 p-4 sm:p-5 ${className}`}>
      <h2 className="font-semibold text-gray-900 mb-3 font-dm">{titre}</h2>
      {children}
    </section>
  );
}

function Ligne({ libelle, valeur }: { libelle: string; valeur: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-1.5 border-b border-gray-50 last:border-0 text-sm">
      <dt className="text-gray-500">{libelle}</dt>
      <dd className="text-gray-900 font-medium text-end break-all">{valeur}</dd>
    </div>
  );
}

/** La fiche d'une visiteuse (compte sans formation) : dates exactes, coordonnées, cours gratuits, activité, visites. */
export default async function FicheVisiteuse({ params }: { params: { id: string } }) {
  if (!UUID.test(params.id)) notFound();
  const p = await chargerProfilVisiteuse(createAdminClient(), params.id);
  if (!p) notFound();
  const { compte: c, connexion: x } = p;
  const nom = c.nom?.trim() || c.email?.split("@")[0] || "Sans nom";
  const avatar = avatarSur(c.avatar_url);
  const tel = telephoneInternational(x.telephone);
  const derniereVisite = p.visites[0]?.created_at ?? null;
  const derniereCour = p.visites.find((v) => estDansLaCour(v.path))?.created_at ?? null;
  const premierCours = [...p.cours].map((k) => k.inscriteLe).filter((d): d is string => Boolean(d)).sort()[0] ?? null;

  return (
    <div className="px-4 lg:px-8 py-6 max-w-6xl">
      <Link href="/admin/visiteuses" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-3">
        <ArrowLeft size={15} /> Toutes les visiteuses
      </Link>

      <header className="bg-white rounded-3xl border border-gray-100 border-t-4 border-t-amber-400 p-5 sm:p-6 mb-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center gap-5">
          {avatar
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={avatar} alt="" width={80} height={80} className="w-20 h-20 rounded-full object-cover bg-gray-100" />
            : <span className="w-20 h-20 rounded-full bg-gradient-to-br from-orange-400 to-violet-600 text-white text-3xl font-semibold flex items-center justify-center">{nom[0]?.toUpperCase()}</span>}
          <div className="flex-1 min-w-0">
            <h1 className="font-playfair text-3xl font-bold text-gray-900">{nom}</h1>
            <div className="text-sm text-gray-500 break-all">{c.email ?? "E-mail non renseigné"}{c.username ? ` · @${c.username}` : ""}</div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {p.inscrite
                ? <span className="text-xs font-semibold rounded-full px-2.5 py-1 bg-emerald-50 text-emerald-700">Inscrite à une formation</span>
                : <span className="text-xs font-semibold rounded-full px-2.5 py-1 bg-amber-50 text-amber-700">Visiteuse · sans formation</span>}
              {x.typeCompte === "patrons" ? <span className="text-xs font-semibold rounded-full px-2.5 py-1 bg-pink-50 text-pink-700">Compte patrons</span> : null}
              {p.sources.map((s) => <span key={s} className="text-xs rounded-full px-2.5 py-1 bg-gray-100 text-gray-600">via {SOURCE_COURTE[s] ?? s}</span>)}
            </div>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          {tel ? <a href={`https://wa.me/${tel}`} target="_blank" rel="noreferrer" className={`${bouton} bg-emerald-500 text-white hover:bg-emerald-600`}><MessageCircle size={15} /> WhatsApp</a> : null}
          {tel ? <a href={`tel:+${tel}`} className={`${bouton} bg-white border border-gray-200 text-gray-700 hover:bg-gray-50`}><Phone size={15} /> Appeler</a> : null}
          {c.email ? <a href={`mailto:${c.email}`} className={`${bouton} bg-white border border-gray-200 text-gray-700 hover:bg-gray-50`}><Mail size={15} /> E-mail</a> : null}
          <Link href={`/communaute/u/${c.id}`} className={`${bouton} bg-white border border-gray-200 text-gray-700 hover:bg-gray-50`}><UserRound size={15} /> Profil communauté</Link>
          {p.inscrite
            ? <Link href={`/admin/classe/${c.id}`} className={`${bouton} bg-[#5B16F9] text-white hover:bg-[#4a10d4]`}><GraduationCap size={15} /> Sa fiche élève</Link>
            : <Link href="/admin/etudiants" className={`${bouton} bg-orange-500 text-white hover:bg-orange-600`}><GraduationCap size={15} /> Inscrire à une formation</Link>}
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Panneau titre="📅 Dates exactes">
          <dl>
            <Ligne libelle="Compte créé le" valeur={dateHeure(x.creeLe ?? c.created_at)} />
            <Ligne libelle="E-mail confirmé le" valeur={x.emailConfirmeLe ? dateHeure(x.emailConfirmeLe) : "pas encore"} />
            <Ligne libelle="Dernière connexion" valeur={x.derniereConnexion ? dateHeure(x.derniereConnexion) : "jamais"} />
            <Ligne libelle="Dernière visite du site" valeur={derniereVisite ? dateHeure(derniereVisite) : "—"} />
            <Ligne libelle="Dernière visite de La Cour" valeur={derniereCour ? dateHeure(derniereCour) : "—"} />
            <Ligne libelle="1er cours gratuit" valeur={premierCours ? dateHeure(premierCours) : "—"} />
          </dl>
        </Panneau>

        <Panneau titre="👤 Coordonnées">
          <dl>
            <Ligne libelle="E-mail" valeur={c.email ?? "—"} />
            <Ligne libelle="Téléphone (WhatsApp)" valeur={x.telephone ?? "—"} />
            <Ligne libelle="Wilaya / ville" valeur={x.wilaya ?? c.ville ?? "—"} />
            <Ligne libelle="Pays" valeur={c.pays ?? "—"} />
            <Ligne libelle="Arrivée par" valeur={p.sources.length ? p.sources.map((s) => SOURCE_COURTE[s] ?? s).join(", ") : "—"} />
          </dl>
        </Panneau>

        <Panneau titre={`🎁 Cours gratuits (${p.cours.length})`}>
          {p.cours.length ? (
            <ul className="space-y-2">
              {p.cours.map((k) => (
                <li key={k.slug} className="flex items-center gap-3 rounded-xl bg-gray-50 p-2.5">
                  {k.couverture
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={k.couverture} alt="" className="w-14 h-14 rounded-lg object-cover bg-gray-200 shrink-0" />
                    : <span className="w-14 h-14 rounded-lg bg-violet-100 text-2xl flex items-center justify-center shrink-0">🎁</span>}
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-gray-900 text-sm">{k.titre}</div>
                    <div className="text-xs text-gray-500">Inscrite le {k.inscriteLe ? dateHeure(k.inscriteLe) : "—"}{k.enLigne ? "" : " · page fermée"}</div>
                  </div>
                  {k.enLigne ? <a href={k.lien} target="_blank" rel="noreferrer" className="text-xs font-semibold text-[#5B16F9] hover:underline shrink-0">Ouvrir</a> : null}
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-gray-400">Aucun cours gratuit enregistré pour cet e-mail.</p>}
        </Panneau>

        <Panneau titre="🧭 Découverte">
          <dl>
            <Ligne libelle="Leçon d'essai" valeur={p.essai ? (p.essai.vue ? `✅ vue — « ${p.essai.titre} »` : `pas encore vue — « ${p.essai.titre} »`) : "—"} />
            <Ligne libelle="Test de niveau" valeur={p.test.fait ? `✅ ${p.test.libelle ?? "fait"}` : "pas encore fait"} />
          </dl>
          <h3 className="font-semibold text-gray-900 mt-4 mb-2 font-dm text-sm">🏛️ Dans La Cour</h3>
          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              ["Publications", p.cour.publications], ["En attente", p.cour.enAttente], ["Commentaires", p.cour.commentaires],
              ["J'aime", p.cour.jaime], ["Stories", p.cour.stories], ["« J'apprends »", p.cour.envies],
            ].map(([l, n]) => (
              <div key={l as string} className="rounded-xl bg-gray-50 py-2">
                <div className="text-lg font-bold text-gray-900 tabular-nums">{n as number}</div>
                <div className="text-[11px] text-gray-500">{l as string}</div>
              </div>
            ))}
          </div>
        </Panneau>

        <Panneau titre={`🕓 Historique des visites (${p.visites.length} dernières pages)`} className="lg:col-span-2">
          {p.visites.length ? (
            <ul className="divide-y divide-gray-50">
              {p.visites.map((v, i) => (
                <li key={`${v.created_at}-${i}`} className="flex items-center gap-3 py-2 text-sm">
                  {v.device === "mobile" ? <Smartphone size={14} className="text-gray-400 shrink-0" aria-label="téléphone" /> : <Monitor size={14} className="text-gray-400 shrink-0" aria-label="ordinateur" />}
                  <span className="text-gray-500 tabular-nums whitespace-nowrap">{dateHeure(v.created_at)}</span>
                  <span className="text-gray-900 truncate flex-1">{libellePage(v.path)}</span>
                  <span className="text-gray-400 text-xs whitespace-nowrap">{v.duration_sec ? fmtDuree(v.duration_sec) : ""}</span>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-gray-400">Aucune visite enregistrée avec son nom (les noms sont enregistrés depuis le 18 octobre 2026, quand elle est connectée).</p>}
        </Panneau>
      </div>
    </div>
  );
}
