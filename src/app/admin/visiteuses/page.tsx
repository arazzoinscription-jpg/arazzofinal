import Link from "next/link";
import { ChevronLeft, ChevronRight, MessageCircle, Search, UserRound } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { dateHeure } from "@/lib/student-care/time";
import { avatarSur } from "@/lib/classe/vue";
import { detaillerAnnuaire, toutesLesVisiteuses, type LigneAnnuaire } from "@/lib/visiteuses/annuaire-load";
import { filtrerAnnuaire, lirePeriodeAnnuaire, pageDe, telephoneInternational, type Periode } from "@/lib/visiteuses/annuaire";

export const metadata = { title: "Visiteuses — Admin" };
export const dynamic = "force-dynamic";

const JOUR = 86_400_000;
const PERIODES: { v: Periode; libelle: string }[] = [
  { v: "tout", libelle: "Toutes" }, { v: "1", libelle: "24 h" }, { v: "7", libelle: "7 jours" }, { v: "30", libelle: "30 jours" },
];
const card = "bg-white rounded-2xl border border-gray-100";

function lien(params: { q: string; periode: Periode; page?: number }) {
  const s = new URLSearchParams();
  if (params.q) s.set("q", params.q);
  if (params.periode !== "tout") s.set("periode", params.periode);
  if (params.page && params.page > 1) s.set("page", String(params.page));
  const qs = s.toString();
  return `/admin/visiteuses${qs ? `?${qs}` : ""}`;
}

function Ligne({ v }: { v: LigneAnnuaire }) {
  const avatar = avatarSur(v.avatar_url);
  const nom = v.nom?.trim() || v.email?.split("@")[0] || "Sans nom";
  const tel = telephoneInternational(v.connexion.telephone);
  return (
    <li className="p-4 border-b border-gray-50 last:border-0">
      <div className="flex items-start gap-3">
        <Link href={`/admin/visiteuses/${v.id}`} className="shrink-0">
          {avatar
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={avatar} alt="" width={44} height={44} className="w-11 h-11 rounded-full object-cover bg-gray-100" />
            : <span className="w-11 h-11 rounded-full bg-gradient-to-br from-orange-400 to-violet-600 text-white font-semibold flex items-center justify-center">{nom[0]?.toUpperCase()}</span>}
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Link href={`/admin/visiteuses/${v.id}`} className="font-semibold text-gray-900 hover:underline">{nom}</Link>
            <span className="text-[11px] font-semibold rounded-full px-2 py-0.5 bg-amber-50 text-amber-700">Visiteuse</span>
            {v.connexion.typeCompte === "patrons" ? <span className="text-[11px] font-semibold rounded-full px-2 py-0.5 bg-pink-50 text-pink-700">Compte patrons</span> : null}
          </div>
          <div className="text-sm text-gray-500 break-all">
            {v.email ?? "—"}{v.connexion.telephone ? ` · ${v.connexion.telephone}` : ""}{v.connexion.wilaya || v.ville ? ` · ${v.connexion.wilaya ?? v.ville}` : ""}
          </div>
          <dl className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-x-4 gap-y-1 text-xs">
            <div><dt className="inline text-gray-400">Compte créé : </dt><dd className="inline text-gray-700 font-medium">{dateHeure(v.connexion.creeLe ?? v.created_at)}</dd></div>
            <div><dt className="inline text-gray-400">Dernière connexion : </dt><dd className="inline text-gray-700 font-medium">{v.connexion.derniereConnexion ? dateHeure(v.connexion.derniereConnexion) : "jamais"}</dd></div>
            <div><dt className="inline text-gray-400">Dernière visite : </dt><dd className="inline text-gray-700 font-medium">{v.derniereVisite ? dateHeure(v.derniereVisite) : "—"}</dd></div>
          </dl>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {v.cours.length ? v.cours.map((c) => (
              <span key={c.slug} className="text-[11px] rounded-full px-2 py-0.5 bg-violet-50 text-violet-700" title={c.inscriteLe ? `Inscrite le ${dateHeure(c.inscriteLe)}` : undefined}>🎁 {c.titre}</span>
            )) : <span className="text-[11px] text-gray-400">Aucun cours gratuit enregistré</span>}
          </div>
        </div>
        <div className="flex flex-col gap-1.5 shrink-0">
          <Link href={`/admin/visiteuses/${v.id}`} className="inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-semibold bg-[#5B16F9]/10 text-[#5B16F9] hover:bg-[#5B16F9]/15"><UserRound size={13} /> Fiche</Link>
          {tel ? <a href={`https://wa.me/${tel}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100"><MessageCircle size={13} /> WhatsApp</a> : null}
        </div>
      </div>
    </li>
  );
}

/** Tous les comptes SANS formation : qui, depuis quand, dernière connexion, cours gratuits — et leur fiche. */
export default async function PageVisiteuses({ searchParams }: { searchParams: { q?: string; periode?: string; page?: string } }) {
  const admin = createAdminClient();
  const q = (searchParams.q ?? "").trim().slice(0, 80);
  const periode = lirePeriodeAnnuaire(searchParams.periode);
  const maintenant = Date.now();

  const { visiteuses, complet } = await toutesLesVisiteuses(admin);
  const depuis = (jours: number) => visiteuses.filter((v) => maintenant - new Date(v.created_at).getTime() < jours * JOUR).length;
  const trouvees = filtrerAnnuaire(visiteuses, { q, periode, maintenant });
  const { lignes, page, pages } = pageDe(trouvees, searchParams.page);
  const details = await detaillerAnnuaire(admin, lignes);

  const kpis = [
    { libelle: "Visiteuses au total", valeur: visiteuses.length },
    { libelle: "Nouvelles (24 h)", valeur: depuis(1) },
    { libelle: "Nouvelles (7 jours)", valeur: depuis(7) },
    { libelle: "Nouvelles (30 jours)", valeur: depuis(30) },
  ];

  return (
    <div className="px-4 lg:px-8 py-6 max-w-6xl">
      <h1 className="font-playfair text-3xl font-bold text-gray-900">Visiteuses</h1>
      <p className="text-gray-500 mb-5 font-dm">
        Tous les comptes créés sur le site SANS formation (cours gratuit, inscription gratuite, La Cour). Dès qu'une visiteuse est inscrite à une formation, elle passe dans « Étudiants ».
      </p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {kpis.map((k) => (
          <div key={k.libelle} className={`${card} p-4`}>
            <div className="text-2xl font-bold font-playfair text-gray-900 tabular-nums">{k.valeur.toLocaleString("fr-FR")}</div>
            <div className="text-xs text-gray-500 font-dm">{k.libelle}</div>
          </div>
        ))}
      </div>

      <form className="flex flex-wrap gap-2 mb-3" action="/admin/visiteuses">
        <label className="flex-1 min-w-56 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden />
          <input name="q" defaultValue={q} placeholder="Nom, e-mail ou ville…" aria-label="Rechercher une visiteuse"
            className="w-full border border-gray-200 rounded-xl ps-9 pe-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-500" />
        </label>
        {periode !== "tout" ? <input type="hidden" name="periode" value={periode} /> : null}
        <button type="submit" className="rounded-xl px-4 py-2.5 bg-gray-900 text-white text-sm font-semibold">Rechercher</button>
      </form>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span className="text-xs text-gray-500">Comptes créés :</span>
        {PERIODES.map((p) => (
          <Link key={p.v} href={lien({ q, periode: p.v })}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold ${p.v === periode ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
            {p.libelle}
          </Link>
        ))}
        <span className="ms-auto text-xs text-gray-500">{trouvees.length.toLocaleString("fr-FR")} compte{trouvees.length > 1 ? "s" : ""}{q ? ` pour « ${q} »` : ""}</span>
      </div>

      {!complet ? <p className="mb-3 rounded-xl bg-amber-50 border border-amber-100 px-4 py-2 text-sm text-amber-800">Liste partielle : trop de comptes pour une seule lecture. Affinez avec la recherche.</p> : null}

      <ul className={card}>
        {details.length ? details.map((v) => <Ligne key={v.id} v={v} />) : <li className="p-6 text-sm text-gray-400">Aucune visiteuse{q ? " pour cette recherche" : ""}.</li>}
      </ul>

      {pages > 1 ? (
        <nav className="flex items-center justify-center gap-3 mt-4" aria-label="Pages">
          {page > 1 ? <Link href={lien({ q, periode, page: page - 1 })} className="inline-flex items-center gap-1 rounded-xl px-3 py-2 text-sm bg-white border border-gray-200"><ChevronLeft size={15} /> Précédentes</Link> : null}
          <span className="text-sm text-gray-500">Page {page} / {pages}</span>
          {page < pages ? <Link href={lien({ q, periode, page: page + 1 })} className="inline-flex items-center gap-1 rounded-xl px-3 py-2 text-sm bg-white border border-gray-200">Suivantes <ChevronRight size={15} /></Link> : null}
        </nav>
      ) : null}
    </div>
  );
}
