"use client";

import { useEffect, useId, useState } from "react";
import { ACTIVITES, AUCUNE, LIBELLE_ACTIVITE, arrondirPct, type CodeActivite, type MonActivite } from "@/lib/presence-membres";
import { changerMienne, etatDe, lireMienne, useMembresEnLigne, type EtatEnLigne } from "./membres";
import { PublierResultat } from "./publier-resultat";

/**
 * « Ce que je fais en ce moment » : 4 activités animées, choisies par l'élève sur son profil.
 * Animations en CSS/SVG (aucune image à charger) ; immobiles si l'appareil demande moins d'animations.
 */

const STYLES = `
@keyframes az-ecrit { 0%,100% { transform: translate(0,0) rotate(-8deg) } 25% { transform: translate(3px,1px) rotate(4deg) } 50% { transform: translate(6px,0) rotate(-6deg) } 75% { transform: translate(3px,2px) rotate(6deg) } }
@keyframes az-clignote { 0%,100% { opacity: .35 } 50% { opacity: 1 } }
@keyframes az-trace { from { stroke-dashoffset: 130 } to { stroke-dashoffset: 0 } }
@keyframes az-aiguille { 0%,100% { transform: translateY(0) } 50% { transform: translateY(5px) } }
@keyframes az-points { from { transform: translateX(0) } to { transform: translateX(-8px) } }
@keyframes az-volant { to { transform: rotate(360deg) } }
@keyframes az-rayures { from { background-position: 0 0 } to { background-position: 24px 0 } }
@keyframes az-sourire { 0%,100% { transform: translateY(0) scale(1) } 50% { transform: translateY(-2px) scale(1.08) } }
.az-ecrit { animation: az-ecrit 1.1s ease-in-out infinite; transform-origin: 50% 90%; transform-box: fill-box }
.az-clignote { animation: az-clignote 1.4s ease-in-out infinite }
.az-trace { stroke-dasharray: 130; animation: az-trace 3.2s linear infinite }
.az-aiguille { animation: az-aiguille .35s ease-in-out infinite; transform-box: fill-box }
.az-points { animation: az-points .7s linear infinite }
.az-volant { animation: az-volant 1.4s linear infinite; transform-origin: center; transform-box: fill-box }
.az-rayures { background-image: linear-gradient(45deg, rgba(255,255,255,.35) 25%, transparent 25%, transparent 50%, rgba(255,255,255,.35) 50%, rgba(255,255,255,.35) 75%, transparent 75%); background-size: 24px 24px; animation: az-rayures .9s linear infinite }
.az-sourire { animation: az-sourire 1.6s ease-in-out infinite; display: inline-block }
@media (prefers-reduced-motion: reduce) { .az-ecrit,.az-clignote,.az-trace,.az-aiguille,.az-points,.az-volant,.az-rayures,.az-sourire { animation: none } .az-trace { stroke-dasharray: none } }
`;

/** Les animations, une seule fois par page. */
export function StylesActivite() {
  return <style>{STYLES}</style>;
}

/** Face à l'écran, elle prend des notes dans son cahier. */
function Theorie() {
  return (
    <svg viewBox="0 0 64 48" className="w-full h-full" aria-hidden>
      <rect x="4" y="6" width="34" height="23" rx="3" fill="#2A0880" />
      <rect x="7" y="9" width="28" height="17" rx="1.5" fill="#5B16F9" />
      <path d="M18 13 L25 17.5 L18 22 Z" fill="#fff" className="az-clignote" />
      <path d="M1 31 h40 l-3 4 h-34 z" fill="#3f10c2" />
      <rect x="40" y="22" width="21" height="22" rx="2" fill="#fff7ed" stroke="#fb923c" strokeWidth="1.2" />
      <path d="M43 28 h15 M43 32 h15 M43 36 h11" stroke="#fdba74" strokeWidth="1.2" />
      <g className="az-ecrit"><path d="M45 39 l10 -12 l2.5 2 l-10 12 l-3.2 1.2 z" fill="#f97316" /><path d="M44.3 41.2 l0.7 -2.2 l2.5 2 z" fill="#1f2937" /></g>
    </svg>
  );
}

/** Un patron qui se trace sur une grande feuille de papier à patron. */
function Patronage() {
  const trace = `az-patron-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  return (
    <svg viewBox="0 0 64 48" className="w-full h-full" aria-hidden>
      <rect x="2" y="5" width="60" height="38" rx="3" fill="#fef3c7" stroke="#f59e0b" strokeWidth="1" />
      <path d="M2 15 h60 M2 25 h60 M2 35 h60 M14 5 v38 M26 5 v38 M38 5 v38 M50 5 v38" stroke="#fcd34d" strokeWidth=".5" />
      <path id={trace} d="M16 38 L21 11 Q32 15 43 11 L48 38 Q32 41 16 38 Z" fill="none" stroke="#5B16F9" strokeWidth="1.8" strokeLinejoin="round" className="az-trace" />
      <g>
        <path d="M0 0 l9 -9 l2.4 2.4 l-9 9 l-3.3 0.9 z" fill="#f97316" />
        <animateMotion dur="3.2s" repeatCount="indefinite" rotate="0"><mpath href={`#${trace}`} /></animateMotion>
      </g>
    </svg>
  );
}

/** La machine à coudre : l'aiguille pique, le volant tourne, les points avancent. */
function Couture() {
  return (
    <svg viewBox="0 0 64 48" className="w-full h-full" aria-hidden>
      <rect x="3" y="39" width="58" height="6" rx="2" fill="#3f10c2" />
      <path d="M2 37 h46" stroke="#fb923c" strokeWidth="2.4" />
      <g className="az-points"><path d="M4 37 h70" stroke="#fff" strokeWidth="1" strokeDasharray="3 2" /></g>
      <rect x="42" y="12" width="13" height="28" rx="3" fill="#5B16F9" />
      <rect x="9" y="7" width="46" height="11" rx="5" fill="#5B16F9" />
      <rect x="9" y="7" width="12" height="20" rx="3" fill="#4c12d6" />
      <circle cx="31" cy="12.5" r="2" fill="#fde68a" />
      <g className="az-volant"><circle cx="57" cy="15" r="5.5" fill="#2A0880" /><path d="M57 10 v10 M52 15 h10" stroke="#a78bfa" strokeWidth="1.3" /></g>
      <g className="az-aiguille"><rect x="14" y="26" width="2" height="6" fill="#9ca3af" /><path d="M14.4 32 h1.2 l-0.6 3 z" fill="#6b7280" /></g>
      <path d="M15 27 q-6 -9 4 -14" fill="none" stroke="#fb923c" strokeWidth=".8" />
    </svg>
  );
}

const TAILLE = { sm: "w-8 h-6", md: "w-14 h-10", lg: "w-24 h-[4.5rem]" } as const;

/** L'icône animée d'une activité (le « modèle en cours » a sa barre de chargement, voir BarreModele). */
export function IconeActivite({ code, taille = "md" }: { code: Exclude<CodeActivite, "modele">; taille?: keyof typeof TAILLE }) {
  return <span className={`inline-block flex-shrink-0 ${TAILLE[taille]}`}>{code === "theorie" ? <Theorie /> : code === "patronage" ? <Patronage /> : <Couture />}</span>;
}

/** « Mon modèle est en cours » : sourire + barre de chargement, pour que les autres attendent le résultat final. */
export function BarreModele({ pct, compacte = false }: { pct: number; compacte?: boolean }) {
  return (
    <span className={`flex items-center gap-2 ${compacte ? "w-full" : "w-full max-w-xs"}`}>
      <span className={`az-sourire ${compacte ? "text-lg" : "text-3xl"}`} aria-hidden>😊</span>
      <span className="flex-1 min-w-0">
        <span className={`block w-full rounded-full bg-orange-100 overflow-hidden ${compacte ? "h-2" : "h-3"}`} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Avancement du modèle">
          <span className="relative block h-full rounded-full bg-gradient-to-r from-orange-400 to-[#5B16F9] overflow-hidden transition-[width] duration-700" style={{ width: `${Math.max(pct, 6)}%` }}>
            <span className="absolute inset-0 az-rayures" aria-hidden />
          </span>
        </span>
        {compacte ? null : <span className="block text-[11px] mt-0.5 opacity-80">{pct} % — résultat final bientôt !</span>}
      </span>
      <span className={compacte ? "text-base" : "text-2xl"} aria-hidden>👗</span>
    </span>
  );
}

/** L'activité d'un membre en ligne, avec son libellé. */
export function BadgeActivite({ code, pct, taille = "md" }: { code: CodeActivite; pct: number | null; taille?: "sm" | "md" }) {
  if (code === "modele") {
    return (
      <span className="flex flex-col gap-1 w-full" title={LIBELLE_ACTIVITE.modele.titre}>
        <span className={`font-semibold ${taille === "sm" ? "text-[10.5px]" : "text-xs"}`}>{LIBELLE_ACTIVITE.modele.court}{taille === "sm" ? ` · ${pct ?? 0} %` : ""}</span>
        <BarreModele pct={pct ?? 0} compacte={taille === "sm"} />
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5" title={LIBELLE_ACTIVITE[code].titre}>
      <IconeActivite code={code} taille={taille === "sm" ? "sm" : "md"} />
      <span className={`font-semibold leading-tight ${taille === "sm" ? "text-[10.5px]" : "text-xs"}`}>{taille === "sm" ? LIBELLE_ACTIVITE[code].court : LIBELLE_ACTIVITE[code].titre}</span>
    </span>
  );
}

const PILULE: Record<EtatEnLigne, { texte: string; classe: string; point: string }> = {
  en_ligne: { texte: "En ligne", classe: "bg-emerald-50 text-emerald-700 border-emerald-200", point: "bg-emerald-500 animate-pulse" },
  hors_ligne: { texte: "Hors ligne", classe: "bg-gray-50 text-gray-500 border-gray-200", point: "bg-gray-300" },
  connexion: { texte: "…", classe: "bg-gray-50 text-gray-400 border-gray-100", point: "bg-gray-200" },
  indisponible: { texte: "Présence indisponible", classe: "bg-amber-50 text-amber-700 border-amber-200", point: "bg-amber-300" },
};

export function PiluleEnLigne({ etat }: { etat: EtatEnLigne }) {
  const s = PILULE[etat];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${s.classe}`} title="En ligne = une page Arazzo est ouverte en ce moment (sauf en mode discrète).">
      <span className={`w-2 h-2 rounded-full ${s.point}`} aria-hidden />{s.texte}
    </span>
  );
}

/** Pastille verte sur la photo d'un membre en ligne (rien sinon). */
export function PointEnLigne({ id, className = "" }: { id: string; className?: string }) {
  const p = useMembresEnLigne();
  const { etat } = etatDe(p, id);
  if (etat !== "en_ligne") return null;
  return <span className={`absolute rounded-full bg-emerald-500 ring-2 ring-white ${className}`} title="En ligne" aria-label="En ligne" />;
}

/** Sur une carte : l'activité d'un membre en ligne (rien s'il est hors ligne ou sans activité). */
export function ActiviteDe({ id }: { id: string }) {
  const p = useMembresEnLigne();
  const { membre } = etatDe(p, id);
  if (!membre?.activite) return null;
  return <span className="mt-2 w-full flex justify-center text-gray-700"><BadgeActivite code={membre.activite} pct={membre.pct} taille="sm" /></span>;
}

/** Sur un profil : en ligne / hors ligne + ce que le membre fait en ce moment. */
export function PresenceDe({ id, sombre = false }: { id: string; sombre?: boolean }) {
  const p = useMembresEnLigne();
  const { etat, membre } = etatDe(p, id);
  return (
    <div className={`flex flex-col items-center gap-2 ${sombre ? "text-white" : "text-gray-800"}`}>
      <StylesActivite />
      <PiluleEnLigne etat={etat} />
      {etat === "en_ligne" && membre?.activite ? (
        <div className={`rounded-2xl px-3 py-2 w-full max-w-xs flex justify-center ${sombre ? "bg-white/10" : "bg-gray-50"}`}>
          <BadgeActivite code={membre.activite} pct={membre.pct} />
        </div>
      ) : null}
    </div>
  );
}

/** Le choix de l'élève, sur SON profil : ce qu'elle fait en ce moment (ou rien), et le mode discrète. */
export function ChoixActivite({ sombre = false }: { sombre?: boolean }) {
  const [a, setA] = useState<MonActivite>(AUCUNE);
  const [pret, setPret] = useState(false);
  useEffect(() => { setA(lireMienne()); setPret(true); }, []);
  function choisir(n: MonActivite) { setA(n); changerMienne(n); }
  const carte = (actif: boolean) => `flex flex-col items-center justify-center gap-1 rounded-2xl border p-2.5 text-center transition min-h-[92px] ${actif
    ? "border-[#5B16F9] bg-[#5B16F9]/10 ring-2 ring-[#5B16F9]/40"
    : sombre ? "border-white/15 bg-white/5 hover:bg-white/10" : "border-gray-200 bg-white hover:bg-gray-50"}`;
  if (!pret) return null;
  return (
    <section aria-labelledby="titre-activite" className={`rounded-3xl border p-4 ${sombre ? "border-white/10 bg-white/5 text-white" : "border-gray-100 bg-white text-gray-800"}`}>
      <StylesActivite />
      <h2 id="titre-activite" className="font-semibold">Ce que je fais en ce moment</h2>
      <p className={`text-xs mt-0.5 mb-3 ${sombre ? "text-white/60" : "text-gray-500"}`}>Visible par vos camarades tant que vous êtes en ligne. S&apos;efface tout seul après 6 heures.</p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {ACTIVITES.map((code) => {
          const actif = a.code === code;
          return (
            <button key={code} type="button" aria-pressed={actif} className={carte(actif)}
              onClick={() => choisir(actif ? { ...a, code: null, pct: null, le: Date.now() } : { ...a, code, pct: code === "modele" ? a.pct ?? 0 : null, le: Date.now() })}>
              {code === "modele" ? <span className="az-sourire text-3xl" aria-hidden>😊</span> : <IconeActivite code={code} />}
              <span className="text-[11.5px] font-semibold leading-tight">{LIBELLE_ACTIVITE[code].titre}</span>
            </button>
          );
        })}
      </div>
      {a.code === "modele" ? (
        <label className={`mt-3 block text-xs ${sombre ? "text-white/80" : "text-gray-600"}`}>
          Mon modèle avance : <b>{a.pct ?? 0} %</b>
          <input type="range" min={0} max={100} step={10} value={a.pct ?? 0} className="w-full accent-[#5B16F9] mt-1"
            onChange={(e) => choisir({ ...a, pct: arrondirPct(e.target.value) ?? 0, le: Date.now() })} />
          <span className="mt-1 flex"><BarreModele pct={a.pct ?? 0} /></span>
        </label>
      ) : null}
      {a.code === "modele" ? (
        // Résultat publié : le statut « modèle en cours » se termine.
        <PublierResultat sombre={sombre} onPublie={() => choisir({ ...a, code: null, pct: null, le: Date.now() })} />
      ) : null}
      <label className={`mt-3 flex items-start gap-2 text-xs ${sombre ? "text-white/70" : "text-gray-600"}`}>
        <input type="checkbox" checked={a.discrete} onChange={(e) => choisir({ ...a, discrete: e.target.checked })} className="mt-0.5" />
        <span>Mode discrète : ne pas montrer que je suis en ligne (ni ce que je fais).</span>
      </label>
    </section>
  );
}
