"use client";

import { useEffect, useState } from "react";
import { Link2, Send, Timer } from "lucide-react";
import { tempsRestant, type Calque } from "@/lib/stories/calques";

/** Le texte doit rester lisible sur les couleurs vives : texte foncé sur fond clair. */
const CLAIRES = new Set(["#FFFFFF", "#FACC15"]);

/** Hauteur de référence d'une story (9:16) pour le dessin, en unités SVG. */
export const RATIO = 16 / 9;

/**
 * Le cadre 9:16 d'une story, aussi grand que possible dans son parent. Le parent doit avoir une taille
 * (ex. flex-1 min-h-0) et `ZONE_CADRE` ; les calques sont dimensionnés en « cqw » (largeur du cadre) :
 * identiques sur téléphone, tablette et ordinateur, dans l'éditeur comme dans la visionneuse.
 */
export const ZONE_CADRE: React.CSSProperties = { containerType: "size" };
export const STYLE_CADRE: React.CSSProperties = { width: "min(100cqw, calc(100cqh * 9 / 16))", aspectRatio: "9 / 16", containerType: "inline-size" };

/** Le fond d'une story : photo (sur un flou de la même photo), vidéo locale (éditeur) ou dégradé « texte seul ». */
export function FondStory({ kind, url, fond, alt }: { kind: "image" | "video" | "texte"; url?: string | null; fond?: string | null; alt?: string }) {
  if (kind === "texte") return <div className="absolute inset-0" style={{ background: fond ?? "#111111" }} aria-hidden />;
  if (!url) return null;
  if (kind === "video") return <video src={url} muted playsInline autoPlay loop className="absolute inset-0 w-full h-full object-contain" />;
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt="" aria-hidden className="absolute inset-0 w-full h-full object-cover blur-2xl scale-110 opacity-60" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt={alt ?? ""} className="absolute inset-0 w-full h-full object-contain" />
    </>
  );
}

export interface Interactions {
  /** L'autrice regarde sa propre story : pas de réponse ni de vote. */
  autrice: boolean;
  mesVotes: Record<string, string>;
  sondages: Record<string, { pct: [number, number]; total: number }>;
  onVoter: (calqueId: string, choix: "0" | "1") => void;
  onRepondre: (calqueId: string, texte: string) => Promise<boolean>;
  /** Mettre la story en pause (saisie d'une réponse). */
  onPause: (p: boolean) => void;
}

function Compte({ c }: { c: Extract<Calque, { type: "compte" }> }) {
  const [, rafraichir] = useState(0);
  useEffect(() => { const t = window.setInterval(() => rafraichir((n) => n + 1), 30_000); return () => window.clearInterval(t); }, []);
  return (
    <div className="rounded-2xl bg-white/95 text-gray-900 px-[4cqw] py-[3cqw] text-center shadow-lg min-w-[45cqw]">
      <div className="text-[3.6cqw] font-bold uppercase tracking-wide text-[#5B16F9] flex items-center justify-center gap-[1.5cqw]"><Timer className="w-[4cqw] h-[4cqw]" aria-hidden /> {c.titre}</div>
      <div className="text-[7.5cqw] font-black leading-tight">{tempsRestant(c.fin, new Date())}</div>
    </div>
  );
}

function Question({ c, inter }: { c: Extract<Calque, { type: "question" }>; inter?: Interactions }) {
  const [texte, setTexte] = useState("");
  const [envoye, setEnvoye] = useState(false);
  return (
    <div className="rounded-2xl overflow-hidden shadow-lg w-[62cqw] text-center">
      <div className="bg-gradient-to-br from-[#5B16F9] to-[#FE7223] text-white text-[4.2cqw] font-bold px-[3.5cqw] py-[3cqw] leading-snug">{c.question}</div>
      <div className="bg-white px-[3cqw] py-[2.5cqw]">
        {inter && !inter.autrice ? (
          envoye ? <p className="text-[3.4cqw] text-emerald-700 font-semibold">Réponse envoyée ✓</p> : (
            <form className="flex items-center gap-[1.5cqw]" onSubmit={async (e) => { e.preventDefault(); if (texte.trim() && await inter.onRepondre(c.id, texte)) { setEnvoye(true); inter.onPause(false); } }}>
              <input value={texte} onChange={(e) => setTexte(e.target.value)} onFocus={() => inter.onPause(true)} onBlur={() => !texte && inter.onPause(false)}
                maxLength={300} placeholder="Écrire une réponse…" className="flex-1 min-w-0 rounded-xl bg-gray-100 px-[2.5cqw] py-[1.8cqw] text-[3.4cqw] text-gray-900 outline-none" />
              <button type="submit" disabled={!texte.trim()} aria-label="Envoyer la réponse" className="rounded-full bg-[#5B16F9] text-white p-[1.8cqw] disabled:opacity-40"><Send className="w-[3.6cqw] h-[3.6cqw]" /></button>
            </form>
          )
        ) : <p className="text-[3.2cqw] text-gray-400">Écrire une réponse…</p>}
      </div>
    </div>
  );
}

function Sondage({ c, inter }: { c: Extract<Calque, { type: "sondage" }>; inter?: Interactions }) {
  const vote = inter?.mesVotes[c.id];
  const res = inter?.sondages[c.id];
  const montrer = Boolean(inter && (vote !== undefined || inter.autrice));
  return (
    <div className="rounded-2xl bg-white/95 shadow-lg w-[62cqw] px-[3cqw] py-[3cqw] text-gray-900">
      <p className="text-[4cqw] font-bold text-center mb-[2cqw] leading-snug">{c.question}</p>
      <div className="space-y-[1.8cqw]">
        {c.choix.map((ch, k) => {
          const pct = res?.pct[k] ?? 0;
          const choisi = vote === String(k);
          return (
            <button key={k} type="button" disabled={!inter || inter.autrice || vote !== undefined}
              onClick={() => inter?.onVoter(c.id, String(k) as "0" | "1")}
              className={`relative w-full overflow-hidden rounded-xl border text-[3.6cqw] font-semibold px-[3cqw] py-[2cqw] text-left ${choisi ? "border-[#5B16F9]" : "border-gray-200"}`}>
              {montrer ? <span className="absolute inset-y-0 start-0 bg-[#5B16F9]/15" style={{ width: `${pct}%` }} aria-hidden /> : null}
              <span className="relative flex justify-between gap-2"><span>{ch}{choisi ? " ✓" : ""}</span>{montrer ? <span>{pct} %</span> : null}</span>
            </button>
          );
        })}
      </div>
      {montrer && res ? <p className="text-[2.8cqw] text-gray-500 text-center mt-[1.5cqw]">{res.total} vote{res.total > 1 ? "s" : ""}</p> : null}
    </div>
  );
}

export function styleTexte(c: Pick<Extract<Calque, { type: "texte" }>, "couleur" | "fond">): React.CSSProperties {
  const claire = CLAIRES.has(c.couleur);
  if (c.fond === "plein") return { background: c.couleur, color: claire ? "#111" : "#fff" };
  if (c.fond === "doux") return { background: "rgba(0,0,0,.45)", color: c.couleur };
  return { color: c.couleur, textShadow: claire ? "0 1px 6px rgba(0,0,0,.55)" : "0 1px 6px rgba(255,255,255,.35)" };
}

/** Un calque, sans sa position (l'éditeur et la visionneuse le placent). */
export function ContenuCalque({ c, inter }: { c: Exclude<Calque, { type: "dessin" }>; inter?: Interactions }) {
  switch (c.type) {
    case "texte":
      return (
        <div className="rounded-[1.5cqw] px-[2cqw] py-[1cqw] font-bold whitespace-pre-wrap leading-tight max-w-[86cqw] break-words"
          style={{ ...styleTexte(c), fontSize: `${6 * c.taille}cqw`, textAlign: c.align === "gauche" ? "left" : c.align === "droite" ? "right" : "center" }}>
          {c.texte}
        </div>
      );
    case "emoji":
      return <div className="leading-none select-none" style={{ fontSize: `${14 * c.taille}cqw` }}>{c.emoji}</div>;
    case "question":
      return <div style={{ transform: `scale(${c.taille})` }}><Question c={c} inter={inter} /></div>;
    case "sondage":
      return <div style={{ transform: `scale(${c.taille})` }}><Sondage c={c} inter={inter} /></div>;
    case "compte":
      return <div style={{ transform: `scale(${c.taille})` }}><Compte c={c} /></div>;
    case "lien": {
      const externe = /^https:/.test(c.url);
      const contenu = <span className="inline-flex items-center gap-[1.5cqw] rounded-full bg-white text-[#5B16F9] font-bold px-[3.5cqw] py-[2cqw] text-[3.8cqw] shadow-lg"><Link2 className="w-[4cqw] h-[4cqw]" aria-hidden /> {c.texte}</span>;
      return inter ? (
        <a href={c.url} target={externe ? "_blank" : undefined} rel={externe ? "noopener noreferrer" : undefined} style={{ transform: `scale(${c.taille})`, display: "inline-block" }}>{contenu}</a>
      ) : <span style={{ transform: `scale(${c.taille})`, display: "inline-block" }}>{contenu}</span>;
    }
    default:
      return null;
  }
}

/** Les traits de dessin (sous les autres calques). */
export function Dessins({ calques, enCours }: { calques: Calque[]; enCours?: { couleur: string; epaisseur: number; points: [number, number][] } | null }) {
  const traits = calques.filter((c): c is Extract<Calque, { type: "dessin" }> => c.type === "dessin");
  if (!traits.length && !enCours) return null;
  const pts = (p: [number, number][]) => p.map(([x, y]) => `${x * 1000},${y * 1000 * RATIO}`).join(" ");
  return (
    <svg viewBox={`0 0 1000 ${1000 * RATIO}`} preserveAspectRatio="none" className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden>
      {[...traits, ...(enCours ? [{ id: "en-cours", ...enCours }] : [])].map((t) => (
        <polyline key={t.id} points={pts(t.points)} fill="none" stroke={t.couleur} strokeWidth={t.epaisseur * 1000} strokeLinecap="round" strokeLinejoin="round" />
      ))}
    </svg>
  );
}

/** Calques qu'on peut toucher dans la visionneuse ; les autres laissent passer le toucher (story suivante/précédente). */
const INTERACTIFS = new Set(["question", "sondage", "lien"]);

/** Tous les calques d'une story, à leur place (visionneuse). */
export function RenduCalques({ calques, inter }: { calques: Calque[]; inter?: Interactions }) {
  return (
    <>
      <Dessins calques={calques} />
      {calques.filter((c) => c.type !== "dessin").map((c) => {
        const x = c as Exclude<Calque, { type: "dessin" }>;
        return (
          <div key={x.id} className={`absolute z-10 w-max max-w-[92cqw] ${INTERACTIFS.has(x.type) ? "" : "pointer-events-none"}`}
            onTouchStart={INTERACTIFS.has(x.type) ? (e) => e.stopPropagation() : undefined}
            style={{ left: `${x.x * 100}%`, top: `${x.y * 100}%`, transform: "translate(-50%, -50%)" }}>
            <ContenuCalque c={x} inter={inter} />
          </div>
        );
      })}
    </>
  );
}
