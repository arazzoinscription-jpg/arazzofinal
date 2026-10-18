import Link from "next/link";
import { Smartphone, Monitor } from "lucide-react";
import { ilYa, libellePage, PERIODES, type Anonymes, type Periode, type Personne, type VisiteurAnonyme } from "@/lib/statistiques-visites";

/** Fiche d'une personne pour l'affichage (nom, photo, pastille). */
export type Profil = { nom: string; avatar: string | null; badge: "Élève" | "Visiteuse" | "Formatrice" };

export const SOURCE_COURTE: Record<string, string> = {
  google: "Google", bing: "Bing", duckduckgo: "DuckDuckGo", facebook: "Facebook", instagram: "Instagram",
  tiktok: "TikTok", youtube: "YouTube", whatsapp: "WhatsApp", telegram: "Telegram", twitter: "X / Twitter",
  direct: "lien direct", other: "un autre site", internal: "le site",
};

const MAX_VISIBLES = 40;
const card = "bg-white rounded-2xl border border-gray-100 p-5";
const BADGE: Record<Profil["badge"], string> = {
  "Élève": "bg-violet-50 text-violet-700",
  Visiteuse: "bg-amber-50 text-amber-700",
  Formatrice: "bg-orange-50 text-orange-700",
};

export function fmtDuree(sec: number): string {
  const s = Math.round(sec);
  if (s < 60) return `${s} s`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  return m % 60 ? `${h} h ${m % 60} min` : `${h} h`;
}

function Avatar({ p, taille = 40 }: { p: Profil; taille?: number }) {
  const initiale = (p.nom.trim()[0] ?? "?").toUpperCase();
  return p.avatar ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={p.avatar} alt="" width={taille} height={taille} className="rounded-full object-cover shrink-0 bg-gray-100" style={{ width: taille, height: taille }} />
  ) : (
    <span className="rounded-full shrink-0 bg-gradient-to-br from-orange-400 to-violet-600 text-white font-semibold flex items-center justify-center" style={{ width: taille, height: taille, fontSize: taille * 0.42 }}>{initiale}</span>
  );
}

/** Puces de période (24 h · 7 jours · 30 jours). */
export function ChoixPeriode({ periode }: { periode: Periode }) {
  return (
    <div className="inline-flex rounded-full bg-gray-100 p-1 gap-1" role="tablist" aria-label="Période">
      {PERIODES.map((p) => (
        <Link key={p.jours} href={`/admin/statistiques?periode=${p.jours}`} scroll={false} role="tab" aria-selected={p.jours === periode}
          className={`px-3.5 py-1.5 rounded-full text-sm font-semibold font-dm ${p.jours === periode ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-800"}`}>
          {p.libelle}
        </Link>
      ))}
    </div>
  );
}

/** « 🟢 En ce moment » : les personnes vues dans les 10 dernières minutes. */
export function EnCeMoment({ personnes, personnesCour, anonymes, anonymesCour, profils }: {
  personnes: string[]; personnesCour: string[]; anonymes: number; anonymesCour: number; profils: Map<string, Profil>;
}) {
  const total = personnes.length + anonymes;
  const cour = new Set(personnesCour);
  return (
    <div className={`${card} mb-6 flex flex-col sm:flex-row sm:items-center gap-4`}>
      <div className="flex items-center gap-3 shrink-0">
        <span className="relative flex w-3 h-3">
          {total > 0 ? <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-60" /> : null}
          <span className={`relative w-3 h-3 rounded-full ${total > 0 ? "bg-emerald-500" : "bg-gray-300"}`} />
        </span>
        <div>
          <div className="font-semibold text-gray-900 font-dm">En ce moment sur le site : {total}</div>
          <div className="text-xs text-gray-500 font-dm">
            {personnes.length} connectée{personnes.length > 1 ? "s" : ""} · {anonymes} sans compte
            {personnesCour.length + anonymesCour > 0 ? ` · ${personnesCour.length + anonymesCour} dans La Cour` : ""} — 10 dernières minutes
          </div>
        </div>
      </div>
      {personnes.length ? (
        <div className="flex flex-wrap gap-2 sm:ms-auto">
          {personnes.slice(0, 16).map((id) => {
            const p = profils.get(id);
            if (!p) return null;
            return (
              <Link key={id} href={`/communaute/u/${id}`} target="_blank" title={`${p.nom}${cour.has(id) ? " — dans La Cour" : ""}`}
                className="inline-flex items-center gap-1.5 rounded-full bg-gray-50 ps-1 pe-3 py-1 text-xs font-dm text-gray-700 hover:bg-gray-100">
                <Avatar p={p} taille={24} />
                <span className="max-w-[9rem] truncate">{p.nom}</span>
                {cour.has(id) ? <span aria-label="dans La Cour">🏛️</span> : null}
              </Link>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function LignePersonne({ p, profil, maintenant, cour }: { p: Personne; profil: Profil; maintenant: number; cour: boolean }) {
  const quand = cour && p.derniereCour ? p.derniereCour : p.derniere;
  const details = cour
    ? [`${p.visitesCour} visite${p.visitesCour > 1 ? "s" : ""} de La Cour`, `${fmtDuree(p.tempsCourSec)} dans La Cour`, `${p.vuesCour} page${p.vuesCour > 1 ? "s" : ""}`]
    : [`${p.visites} visite${p.visites > 1 ? "s" : ""}`, `${p.vues} page${p.vues > 1 ? "s" : ""}`, `${fmtDuree(p.tempsSec)} sur le site`, `arrivée par ${SOURCE_COURTE[p.source] ?? p.source}`];
  return (
    <li className="flex items-start gap-3 py-3 border-b border-gray-50 last:border-0">
      <Link href={`/communaute/u/${p.userId}`} target="_blank" className="shrink-0"><Avatar p={profil} /></Link>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <Link href={`/communaute/u/${p.userId}`} target="_blank" className="font-semibold text-gray-900 font-dm hover:underline truncate max-w-[14rem]">{profil.nom}</Link>
          <span className={`text-[11px] font-semibold rounded-full px-2 py-0.5 ${BADGE[profil.badge]}`}>{profil.badge}</span>
          <span className="ms-auto text-xs text-gray-500 font-dm whitespace-nowrap">{ilYa(quand, maintenant)}</span>
        </div>
        <div className="text-xs text-gray-500 font-dm mt-0.5">
          {p.appareil === "mobile"
            ? <Smartphone size={12} aria-label="téléphone" className="inline-block align-[-2px] me-1" />
            : <Monitor size={12} aria-label="ordinateur" className="inline-block align-[-2px] me-1" />}
          {details.join(" · ")}
        </div>
        {!cour ? <div className="text-xs text-gray-400 font-dm mt-0.5 truncate">Dernière page : {libellePage(p.dernierePage)}</div> : null}
      </div>
    </li>
  );
}

/** Liste des personnes (les 40 plus récentes, le reste dépliable). */
export function ListePersonnes({ titre, sousTitre, personnes, profils, maintenant, cour, vide, pied }: {
  titre: string; sousTitre: string; personnes: Personne[]; profils: Map<string, Profil>; maintenant: number; cour: boolean; vide: string; pied?: React.ReactNode;
}) {
  const avecProfil = personnes.filter((p) => profils.has(p.userId));
  const ligne = (p: Personne) => <LignePersonne key={p.userId} p={p} profil={profils.get(p.userId)!} maintenant={maintenant} cour={cour} />;
  return (
    <div className={card}>
      <div className="flex items-baseline justify-between gap-3 mb-1">
        <h2 className="font-semibold text-gray-900 font-dm">{titre}</h2>
        <span className="text-2xl font-bold font-playfair text-gray-900 tabular-nums">{avecProfil.length}</span>
      </div>
      <p className="text-xs text-gray-500 font-dm mb-2">{sousTitre}</p>
      {avecProfil.length === 0 ? <p className="text-sm text-gray-400 font-dm py-4">{vide}</p> : (
        <ul>
          {avecProfil.slice(0, MAX_VISIBLES).map(ligne)}
          {avecProfil.length > MAX_VISIBLES ? (
            <li>
              <details>
                <summary className="cursor-pointer text-sm font-semibold text-orange-600 font-dm py-3">Voir les {avecProfil.length - MAX_VISIBLES} autres</summary>
                <ul>{avecProfil.slice(MAX_VISIBLES).map(ligne)}</ul>
              </details>
            </li>
          ) : null}
        </ul>
      )}
      {pied ? <div className="mt-3 pt-3 border-t border-gray-50 text-sm text-gray-600 font-dm">{pied}</div> : null}
    </div>
  );
}

const MAX_ANONYMES = 100;

/** Un visiteur sans compte : pas de nom possible, mais ce qu'il a fait (repère #K7Q2M = toujours le même téléphone). */
function LigneAnonyme({ v, maintenant, cour }: { v: VisiteurAnonyme; maintenant: number; cour: boolean }) {
  const quand = cour && v.derniereCour ? v.derniereCour : v.derniere;
  const details = cour
    ? [`${v.visitesCour} visite${v.visitesCour > 1 ? "s" : ""} de La Cour`, `${v.vuesCour} page${v.vuesCour > 1 ? "s" : ""}`, fmtDuree(v.tempsCourSec)]
    : [`${v.visites} visite${v.visites > 1 ? "s" : ""}`, `${v.vues} page${v.vues > 1 ? "s" : ""}`, fmtDuree(v.tempsSec)];
  return (
    <li className="py-2 border-b border-gray-50 last:border-0 text-xs font-dm text-gray-600">
      <div className="flex items-center gap-2">
        <span className="font-mono font-semibold text-gray-800">{v.code}</span>
        {v.appareil === "mobile" ? <Smartphone size={12} aria-label="téléphone" /> : <Monitor size={12} aria-label="ordinateur" />}
        <span>arrivé par {SOURCE_COURTE[v.source] ?? v.source}</span>
        <span className="ms-auto text-gray-400 whitespace-nowrap">{ilYa(quand, maintenant)}</span>
      </div>
      <div className="text-gray-500">{details.join(" · ")}{cour ? "" : ` · dernière page : ${libellePage(v.dernierePage)}`}</div>
    </li>
  );
}

/** « + N visiteurs sans compte » (et d'où ils viennent), puis le détail de chacun, à déplier. */
export function PiedAnonymes({ anonymes, cour, maintenant }: { anonymes: Anonymes; cour: boolean; maintenant: number }) {
  const liste = cour ? anonymes.liste.filter((v) => v.vuesCour > 0).sort((a, b) => (b.derniereCour ?? "").localeCompare(a.derniereCour ?? "")) : anonymes.liste;
  const detail = liste.length ? (
    <details className="mt-2">
      <summary className="cursor-pointer text-sm font-semibold text-orange-600">Voir {liste.length > 1 ? `ces ${liste.length} visiteurs` : "ce visiteur"} un par un</summary>
      <p className="text-xs text-gray-400 mt-1">Sans compte, pas de nom : le repère (#K7Q2M) désigne toujours le même téléphone. Dès que la personne se connecte ou crée son compte, toutes ces visites passent sous son nom, en haut.</p>
      <ul className="mt-1">
        {liste.slice(0, MAX_ANONYMES).map((v) => <LigneAnonyme key={v.code + v.derniere} v={v} maintenant={maintenant} cour={cour} />)}
      </ul>
      {liste.length > MAX_ANONYMES ? <p className="text-xs text-gray-400 mt-1">… et {liste.length - MAX_ANONYMES} autres, plus anciens.</p> : null}
    </details>
  ) : null;
  if (cour) {
    return anonymes.visiteursCour
      ? <>👤 + <strong>{anonymes.visiteursCour}</strong> visiteur{anonymes.visiteursCour > 1 ? "s" : ""} sans compte ont regardé La Cour ({anonymes.vuesCour} page{anonymes.vuesCour > 1 ? "s" : ""}).{detail}</>
      : <>👤 Aucun visiteur sans compte dans La Cour sur cette période.</>;
  }
  if (!anonymes.visiteurs) return <>👤 Aucun visiteur sans compte sur cette période.</>;
  return (
    <>
      👤 + <strong>{anonymes.visiteurs}</strong> visiteur{anonymes.visiteurs > 1 ? "s" : ""} sans compte ({anonymes.vues} page{anonymes.vues > 1 ? "s" : ""}) — arrivé{anonymes.visiteurs > 1 ? "s" : ""} par{" "}
      {anonymes.sources.slice(0, 5).map((s, i) => (
        <span key={s.source}>{i ? ", " : ""}{SOURCE_COURTE[s.source] ?? s.source} <strong className="tabular-nums">{s.n}</strong></span>
      ))}
      .
      {detail}
    </>
  );
}
