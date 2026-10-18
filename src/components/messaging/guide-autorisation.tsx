"use client";

import { useCallback, useState } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, CheckCircle2, ClipboardCopy, ExternalLink, Mic, Video, X } from "lucide-react";
import { adresseReglages, detecterContexte, etapesAutorisation, lienOuvrirChrome, messageEchec, raisonEchec, type Besoin, type Contexte } from "@/lib/autorisations-media";

type Fenetre =
  | { type: "avant"; besoin: Besoin; resoudre: (ok: boolean) => void }
  | { type: "refus"; besoin: Besoin; reessayer: () => void; code?: string }
  | null;

function contexteActuel(): Contexte {
  const installee = window.matchMedia?.("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return detecterContexte(navigator.userAgent, installee);
}

/** Accès déjà donné, refusé, ou pas encore demandé (« inconnu » : le navigateur ne le dit pas). */
async function etatPermission(besoin: Besoin): Promise<"granted" | "denied" | "prompt" | "inconnu"> {
  try {
    const noms = besoin === "micro" ? ["microphone"] : ["camera", "microphone"];
    const etats = await Promise.all(noms.map((n) => navigator.permissions.query({ name: n as PermissionName }).then((r) => r.state)));
    if (etats.includes("denied")) return "denied";
    if (etats.every((e) => e === "granted")) return "granted";
    return "prompt";
  } catch {
    return "inconnu";
  }
}

const TEXTES: Record<Besoin, { titre: string; pourquoi: string; bloque: string; demande: string }> = {
  micro: {
    titre: "Autoriser le micro",
    pourquoi: "Pour enregistrer un message vocal, Arazzo a besoin de votre micro.",
    bloque: "Le micro est bloqué",
    demande: "formation-arazzo.store souhaite utiliser votre micro",
  },
  camera: {
    titre: "Autoriser la caméra et le micro",
    pourquoi: "Pour enregistrer une vidéo ronde (votre visage), Arazzo a besoin de votre caméra et de votre micro.",
    bloque: "La caméra ou le micro est bloqué",
    demande: "formation-arazzo.store souhaite utiliser votre caméra et votre micro",
  },
};

function FenetreGuide({ fenetre, fermer }: { fenetre: NonNullable<Fenetre>; fermer: (ok: boolean) => void }) {
  const [copie, setCopie] = useState(false);
  const t = TEXTES[fenetre.besoin];
  const Icone = fenetre.besoin === "micro" ? Mic : Video;
  const c = contexteActuel();
  const adresse = fenetre.type === "refus" ? adresseReglages(c, window.location.origin) : null;
  const chrome = fenetre.type === "refus" ? lienOuvrirChrome(c, window.location.href) : null;

  async function copier() {
    if (!adresse) return;
    try { await navigator.clipboard.writeText(adresse); setCopie(true); } catch { setCopie(false); }
  }

  return (
    <div role="dialog" aria-modal="true" aria-label={fenetre.type === "avant" ? t.titre : t.bloque}
      className="fixed inset-0 z-[95] bg-black/60 flex items-end sm:items-center justify-center p-3" onClick={() => fermer(false)}>
      <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-3xl bg-white text-gray-900 p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start gap-3">
          <span className={`w-12 h-12 shrink-0 rounded-2xl grid place-items-center ${fenetre.type === "avant" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`} aria-hidden>
            {fenetre.type === "avant" ? <Icone size={24} /> : <AlertTriangle size={24} />}
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="font-bold text-lg leading-tight">{fenetre.type === "avant" ? t.titre : t.bloque}</h2>
            <p className="text-sm text-gray-600 mt-1">{fenetre.type === "avant" ? t.pourquoi : c.integre ? "Ce navigateur bloque l’accès. Suivez ces étapes :" : "L’accès a été refusé. Suivez ces étapes pour l’autoriser :"}</p>
          </div>
          <button type="button" onClick={() => fermer(false)} aria-label="Fermer" className="p-1.5 -m-1 rounded-full text-gray-400 hover:bg-gray-100"><X size={20} /></button>
        </div>

        {fenetre.type === "avant" ? (
          <>
            {/* Ce que le téléphone va afficher, et où appuyer */}
            <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 p-3 text-sm">
              <p className="font-medium">🔒 {t.demande}</p>
              <div className="mt-3 flex justify-end gap-2">
                <span className="rounded-full px-4 py-1.5 text-gray-500 bg-gray-200/70">Bloquer</span>
                <span className="relative rounded-full px-4 py-1.5 font-bold text-white bg-green-600 ring-4 ring-green-300 animate-pulse">Autoriser
                  <span className="absolute -bottom-6 end-1 text-lg" aria-hidden>👆</span>
                </span>
              </div>
            </div>
            <p className="mt-7 text-sm text-gray-700">Votre {c.appareil === "pc" ? "navigateur" : "téléphone"} va afficher cette demande : appuyez sur <b className="text-green-700">« Autoriser »</b>.</p>
            <p dir="rtl" lang="ar" className="mt-1 text-sm text-gray-500">{c.appareil === "pc" ? "سيطلب منكِ المتصفح الإذن" : "سيطلب منكِ الهاتف الإذن"}، اضغطي على « Autoriser » (سماح).</p>
            <div className="mt-5 flex flex-col gap-2">
              <button type="button" onClick={() => fermer(true)} className="w-full rounded-2xl bg-green-600 hover:bg-green-700 text-white font-bold py-3.5">Continuer</button>
              <button type="button" onClick={() => fermer(false)} className="w-full rounded-2xl text-gray-500 py-2 text-sm">Pas maintenant</button>
            </div>
          </>
        ) : (
          <>
            <ol className="mt-4 space-y-3">
              {etapesAutorisation(c, fenetre.besoin).map((e, k) => (
                <li key={k} className="flex gap-3 text-sm">
                  <span className="w-7 h-7 shrink-0 rounded-full bg-green-600 text-white grid place-items-center font-bold text-xs">{k + 1}</span>
                  <span className="pt-1">{e}</span>
                </li>
              ))}
            </ol>
            {chrome ? (
              <a href={chrome} className="mt-4 w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-green-600 hover:bg-green-700 text-white font-bold py-3.5">
                <ExternalLink size={18} aria-hidden /> Ouvrir dans Chrome
              </a>
            ) : null}
            {adresse ? (
              <div className="mt-4 rounded-2xl border-2 border-green-600/30 bg-green-50 p-3">
                <p className="text-xs text-green-900 mb-2">Les réglages de ce site, à coller dans la barre d’adresse (Ctrl+V, puis Entrée) :</p>
                <code className="block text-[11px] break-all bg-white rounded-lg px-2 py-1.5 border border-green-200">{adresse}</code>
                <button type="button" onClick={copier} className="mt-2 inline-flex items-center gap-2 rounded-xl bg-green-600 hover:bg-green-700 text-white font-semibold px-4 py-2 text-sm">
                  <ClipboardCopy size={16} aria-hidden /> {copie ? "Copiée ! Collez-la en haut" : "Copier l’adresse des réglages"}
                </button>
              </div>
            ) : null}
            <div className="mt-5 flex flex-col gap-2">
              <button type="button" onClick={() => { fermer(false); fenetre.reessayer(); }} className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-green-600 hover:bg-green-700 text-white font-bold py-3.5">
                <CheckCircle2 size={18} aria-hidden /> C’est fait — Réessayer
              </button>
              <button type="button" onClick={() => fermer(false)} className="w-full rounded-2xl text-gray-500 py-2 text-sm">Fermer</button>
            </div>
            {/* Pour l'équipe, si ça ne marche toujours pas : l'appareil, le navigateur et le code d'erreur. */}
            <p className="mt-2 text-center text-[11px] text-gray-400">
              {c.appareil === "android" ? "Android" : c.appareil === "iphone" ? "iPhone" : "Ordinateur"} · {c.integre ?? c.navigateur}{c.installee ? " · application" : ""}{fenetre.code ? ` · ${fenetre.code}` : ""}
            </p>
          </>
        )}
      </div>
    </div>
  );
}

/**
 * Le guide d'autorisation caméra / micro, comme dans les autres applications :
 * — AVANT la demande du navigateur : une fenêtre explique pourquoi et montre où appuyer (« Autoriser ») ;
 * — après un REFUS : les étapes exactes pour cet appareil (Android, iPhone, ordinateur ; navigateur ou application
 *   installée), un bouton vert « Réessayer » et, sur ordinateur (Chrome, Edge), l'adresse des réglages du site.
 * Un site ne peut pas ouvrir lui-même les réglages du téléphone : le guide y mène pas à pas.
 */
export function useAutorisationMedia() {
  const [fenetre, setFenetre] = useState<Fenetre>(null);

  /** Avant d'ouvrir le micro / la caméra. true = on peut demander (déjà autorisé, ou explication lue). */
  const preparer = useCallback(async (besoin: Besoin, reessayer: () => void): Promise<boolean> => {
    const etat = await etatPermission(besoin);
    if (etat === "granted") return true;
    if (etat === "denied") { setFenetre({ type: "refus", besoin, reessayer, code: "déjà refusé" }); return false; }
    return new Promise<boolean>((resoudre) => setFenetre({ type: "avant", besoin, resoudre }));
  }, []);

  /** L'ouverture a échoué : le guide si c'est un refus (renvoie null), sinon le message à afficher. */
  const echec = useCallback((besoin: Besoin, erreur: unknown, reessayer: () => void): string | null => {
    const r = raisonEchec((erreur as { name?: string } | null)?.name);
    const code = (erreur as { name?: string } | null)?.name;
    if (r === "refuse") { setFenetre({ type: "refus", besoin, reessayer, code }); return null; }
    return messageEchec(r, besoin);
  }, []);

  const fermer = useCallback((ok: boolean) => {
    setFenetre((f) => { if (f?.type === "avant") f.resoudre(ok); return null; });
  }, []);

  const rendu = fenetre && typeof document !== "undefined" ? createPortal(<FenetreGuide fenetre={fenetre} fermer={fermer} />, document.body) : null;
  return { preparer, echec, rendu };
}
