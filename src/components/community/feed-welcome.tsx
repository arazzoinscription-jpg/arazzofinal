"use client";

/**
 * L'ACCUEIL DU FEED pour les nouvelles visiteuses.
 *
 * Quelqu'un qui découvre le feed (lien reçu en commentant « feed », partage, bouche-à-oreille) regarde,
 * fait défiler… et au bout de 2-3 secondes de défilement on lui propose le TEST DE NIVEAU — le même que sur
 * les landings, avec un CODE PROMO en cadeau à la fin.
 *
 *   1. Invitation : « Tu es en train de découvrir Arazzo → tiens, si tu veux savoir où tu te situes, voilà le test. »
 *      [Faire le test]  ·  [Ignorer]
 *   2. Si elle ignore (ou ferme le test avant la fin) : une DELIVERY PAGE s'ouvre en fenêtre — la page de cours
 *      gratuit (vidéo « comment on forme nos candidates », formulaire, code promo) EXACTEMENT comme sur
 *      `/free/<adresse>`. C'est la même page : mêmes textes, même formulaire, même déblocage, même code promo.
 *      Laquelle ? Celle dont l'adresse est réglée dans l'OS (« Textes des landings » → « feed »). On peut donc
 *      la remplacer par un vrai cours gratuit quand on veut, sans toucher au code.
 *
 * Règles de politesse (une visiteuse n'est jamais harcelée) :
 *   - jamais pour une personne connectée ;
 *   - jamais deux fenêtres en même temps : on attend que l'invitation à se connecter, les commentaires, etc.
 *     soient fermés ;
 *   - une personne qui a TERMINÉ le test, ou qui a déjà reçu le cours gratuit (formulaire rempli), n'est plus
 *     sollicitée ; sinon au moins 3 jours entre deux invitations, 3 invitations au plus ;
 *   - tout est refermable (✕, Échap, clic à côté), et rien ne bloque le feed.
 *
 * Les textes de l'invitation ont un défaut FR/AR ici ; l'équipe peut les réécrire dans l'OS.
 */

import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Gift, X, ClipboardList } from "lucide-react";
import LevelTestPopup from "@/lib/level-test-popup";
import DeliveryLanding from "@/app/free/[slug]/delivery-landing";
import { LandingStyles, utmDeLURL } from "@/lib/landing-kit";
import type { Promo } from "@/app/free/[slug]/promo-banner";

// ── Réglages ────────────────────────────────────────────────────────────────
/** Après le PREMIER geste de défilement : le temps de voir la 1re vidéo avant d'être sollicitée. */
export const DELAI_APRES_SCROLL_MS = 2500;
/** Une personne qui regarde sans jamais défiler : on l'invite quand même, plus tard. */
export const DELAI_SANS_SCROLL_MS = 25_000;
/** Entre deux invitations. */
export const PAUSE_ENTRE_INVITATIONS_MS = 3 * 24 * 3600 * 1000;
/** Au plus trois invitations à une même personne (puis on la laisse tranquille). */
export const MAX_INVITATIONS = 3;

const CLE_MEMOIRE = "arazzo_feed_welcome_v1";
// Même clé que les Delivery Pages : la langue choisie quelque part vaut partout.
const CLE_LANGUE = "arazzo_delivery_langue";
const SLUG_TEST = { fr: "niveau-couture", ar: "niveau-couture-ar" } as const;

type Langue = "fr" | "ar";
type Etape = null | "invite" | "test" | "cours";
type Memoire = { done?: boolean; seen?: number; last?: number };
type Textes = Record<string, string>;

const T: Record<Langue, Textes> = {
  fr: {
    inviteTitle: "Bienvenue sur Arazzo 👋",
    inviteText: "Tu es en train de découvrir Arazzo → tiens, si tu veux savoir où tu te situes, voilà le test.",
    invitePromo: "Un code promo t’attend à la fin du test.",
    inviteCta: "Faire le test de niveau",
    inviteSkip: "Ignorer",
    close: "Fermer",
  },
  ar: {
    inviteTitle: "مرحبا بيكِ في أرازو 👋",
    inviteText: "راكِ تكتشفي أرازو ← إذا حبيتي تعرفي وين راكِ واقفة، هاك الاختبار.",
    invitePromo: "كود تخفيض ينتظرك في نهاية الاختبار.",
    inviteCta: "قومي باختبار المستوى",
    inviteSkip: "تجاهلي",
    close: "إغلاق",
  },
};

// ── Mémoire locale (best-effort : un navigateur sans stockage = on ne sollicite pas en boucle) ─────────────
function lireMemoire(): Memoire {
  try {
    const brut = window.localStorage.getItem(CLE_MEMOIRE);
    return brut ? (JSON.parse(brut) as Memoire) : {};
  } catch { return {}; }
}
function ecrireMemoire(m: Memoire) {
  try { window.localStorage.setItem(CLE_MEMOIRE, JSON.stringify(m)); } catch { /* stockage indispo */ }
}

/** Peut-on encore l'inviter ? (jamais terminé, pas trop souvent, pas trop de fois) */
export function peutInviter(m: Memoire, maintenant = Date.now()): boolean {
  if (m.done) return false;
  if ((m.seen ?? 0) >= MAX_INVITATIONS) return false;
  if (m.last && maintenant - m.last < PAUSE_ENTRE_INVITATIONS_MS) return false;
  return true;
}

function Portal({ children }: { children: ReactNode }) {
  const [monte, setMonte] = useState(false);
  useEffect(() => setMonte(true), []);
  if (!monte || typeof document === "undefined") return null;
  return createPortal(children, document.body);
}

/** Les jetons de couleur du kit des landings, sans son fond plein écran : le popup du test s'y habille. */
const PORTEE_KIT: CSSProperties = {
  position: "static", inset: "auto", zIndex: "auto", overflow: "visible", background: "none",
};

export function FeedWelcome({
  page, promo, blocked, onOpenChange,
}: {
  /** La Delivery Page à proposer en 2e fenêtre (instantané public), ou `null` : alors pas de 2e fenêtre. */
  page: Record<string, any> | null;
  /** Le code promo du moment (celui de cette page), montré à la fin du test. */
  promo: Promo | null;
  /** Une autre fenêtre du feed est ouverte : on attend. */
  blocked: boolean;
  /** Dit au feed qu'une fenêtre d'accueil est ouverte (pour qu'il n'ouvre pas la sienne par-dessus). */
  onOpenChange?: (ouvert: boolean) => void;
}) {
  const [langue, setLangue] = useState<Langue>("fr");
  const [surcharges, setSurcharges] = useState<{ fr?: Textes; ar?: Textes }>({});
  const [autorise, setAutorise] = useState(false);
  const [etape, setEtape] = useState<Etape>(null);

  const declenche = useRef(false);
  const termine = useRef(false);
  const bloqueRef = useRef(blocked);
  bloqueRef.current = blocked;
  // Le rappel du parent peut changer à chaque rendu : on le lit par une référence, pour qu'un rendu du parent
  // ne relance JAMAIS le minuteur d'invitation (il le perdrait).
  const ouvertureRef = useRef(onOpenChange);
  ouvertureRef.current = onOpenChange;

  const t: Textes = { ...T[langue], ...(surcharges[langue] ?? {}) };
  const rtl = langue === "ar";
  const slugPage = page ? String(page.slug ?? "") : "";

  const signaler = useCallback((ouvert: boolean) => { ouvertureRef.current?.(ouvert); }, []);

  // 1) Mémoire + langue, une fois montée (jamais au rendu serveur).
  useEffect(() => {
    let dejaRecu = false;
    // Elle a déjà rempli le formulaire de la Delivery Page proposée : elle a SON cours, on la laisse tranquille.
    try { dejaRecu = Boolean(slugPage) && window.localStorage.getItem(`delivery_sent_${slugPage}`) === "1"; } catch { /* ignore */ }
    setAutorise(!dejaRecu && peutInviter(lireMemoire()));
    try {
      const gardee = window.localStorage.getItem(CLE_LANGUE);
      if (gardee === "ar" || gardee === "fr") { setLangue(gardee); return; }
    } catch { /* ignore */ }
    if ((navigator.language || "").toLowerCase().startsWith("ar")) setLangue("ar");
  }, [slugPage]);

  // 2) Les textes de l'invitation réglés dans l'OS (page « feed »), par-dessus les défauts. Best-effort.
  useEffect(() => {
    let vivant = true;
    (async () => {
      try {
        const r = await fetch("/api/landing-texts?page=feed", { cache: "no-store" });
        if (r.ok && vivant) setSurcharges(await r.json());
      } catch { /* défauts */ }
    })();
    return () => { vivant = false; };
  }, []);

  // 3) Le déclenchement : 2,5 s après le PREMIER geste de défilement (ou 25 s sans geste).
  useEffect(() => {
    if (!autorise || declenche.current) return undefined;
    let minuteur: number | undefined;

    const essayer = () => {
      minuteur = undefined;
      if (declenche.current) return;
      // Une autre fenêtre est ouverte : on réessaie dans un instant, sans jamais s'empiler.
      if (bloqueRef.current) { minuteur = window.setTimeout(essayer, 1500); return; }
      declenche.current = true;
      const m = lireMemoire();
      ecrireMemoire({ ...m, seen: (m.seen ?? 0) + 1, last: Date.now() });
      setEtape("invite");
      signaler(true);
    };
    const armer = (delai: number) => { if (minuteur === undefined) minuteur = window.setTimeout(essayer, delai); };
    const surGeste = () => armer(DELAI_APRES_SCROLL_MS);
    const surTouche = (e: KeyboardEvent) => {
      if (["ArrowDown", "PageDown", " ", "ArrowUp", "PageUp"].includes(e.key)) surGeste();
    };

    // `scroll` ne remonte pas : on écoute en CAPTURE pour entendre le conteneur du feed (qui défile seul).
    window.addEventListener("scroll", surGeste, { capture: true, passive: true });
    window.addEventListener("wheel", surGeste, { passive: true });
    window.addEventListener("touchmove", surGeste, { passive: true });
    window.addEventListener("keydown", surTouche);
    const secours = window.setTimeout(() => armer(0), DELAI_SANS_SCROLL_MS);

    return () => {
      window.removeEventListener("scroll", surGeste, { capture: true });
      window.removeEventListener("wheel", surGeste);
      window.removeEventListener("touchmove", surGeste);
      window.removeEventListener("keydown", surTouche);
      window.clearTimeout(secours);
      if (minuteur !== undefined) window.clearTimeout(minuteur);
    };
  }, [autorise, signaler]);

  const fermer = useCallback(() => {
    setEtape(null);
    signaler(false);
  }, [signaler]);

  // Échap referme la Delivery Page (elle est plein écran).
  useEffect(() => {
    if (etape !== "cours") return undefined;
    const surTouche = (e: KeyboardEvent) => { if (e.key === "Escape") fermer(); };
    window.addEventListener("keydown", surTouche);
    return () => window.removeEventListener("keydown", surTouche);
  }, [etape, fermer]);

  /** Elle ignore : on lui ouvre la Delivery Page (vidéo + formulaire + code promo) — seulement si elle existe. */
  function ignorer() {
    if (page) setEtape("cours");
    else fermer();
  }

  function basculerLangue() {
    const suite: Langue = langue === "fr" ? "ar" : "fr";
    setLangue(suite);
    try { window.localStorage.setItem(CLE_LANGUE, suite); } catch { /* ignore */ }
  }

  function testTermine() {
    termine.current = true;
    ecrireMemoire({ ...lireMemoire(), done: true });
  }

  function fermerTest() {
    // Un test fermé avant la fin = ignoré : on ouvre la Delivery Page. Un test terminé : on la laisse tranquille.
    if (termine.current) fermer();
    else ignorer();
  }

  if (!etape) return null;

  const utm = {
    ...utmDeLURL(),
    utm_source: utmDeLURL().utm_source || "feed",
    utm_medium: "popup",
    utm_campaign: "feed-welcome",
    utm_content: "communaute",
  };

  return (
    <>
      {etape === "invite" && (
        <Portal>
          <div className="fixed inset-0 z-[75] flex items-end sm:items-center sm:justify-center" dir={rtl ? "rtl" : "ltr"}
            role="dialog" aria-modal="true" aria-label={t.inviteTitle} onClick={ignorer}>
            <div className="absolute inset-0 bg-black/55" />
            <div onClick={(e) => e.stopPropagation()}
              className="relative w-full sm:max-w-sm bg-white rounded-t-3xl sm:rounded-3xl p-6 pb-[max(24px,env(safe-area-inset-bottom))] text-center">
              <button type="button" onClick={ignorer} aria-label={t.close}
                className="absolute top-3 end-3 w-8 h-8 grid place-items-center rounded-full bg-gray-100 text-gray-500"><X size={16} /></button>
              <button type="button" onClick={basculerLangue}
                className="absolute top-3 start-3 text-xs font-semibold text-violet-700 bg-violet-50 rounded-full px-2.5 py-1">
                {langue === "fr" ? "العربية" : "Français"}
              </button>
              <span className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-violet-600 text-white mt-4 mb-4">
                <ClipboardList size={26} />
              </span>
              <h3 className="font-playfair text-2xl font-bold text-violet-950 mb-2">{t.inviteTitle}</h3>
              <p className="text-gray-700 font-dm text-[15px] leading-relaxed mb-3">{t.inviteText}</p>
              {promo?.code ? (
                <p className="inline-flex items-center gap-1.5 bg-orange-50 text-orange-700 font-dm text-sm font-semibold rounded-full px-3 py-1.5 mb-4">
                  <Gift size={15} /> {t.invitePromo}
                </p>
              ) : <div className="mb-2" />}
              <div className="flex flex-col gap-2.5">
                <button type="button" onClick={() => setEtape("test")}
                  className="w-full inline-flex items-center justify-center gap-2 bg-orange-DEFAULT text-white py-3 rounded-2xl font-bold hover:bg-orange-600 transition-colors">
                  <ClipboardList size={18} /> {t.inviteCta}
                </button>
                <button type="button" onClick={ignorer} className="text-sm text-gray-400 font-dm mt-1 hover:text-gray-600">{t.inviteSkip}</button>
              </div>
            </div>
          </div>
        </Portal>
      )}

      {etape === "test" && (
        <Portal>
          {/* Les jetons de couleur du kit des landings (le popup du test s'y habille), sans son fond plein écran. */}
          <div className="pl" dir={rtl ? "rtl" : "ltr"} style={PORTEE_KIT}>
            <LandingStyles />
            <LevelTestPopup
              slug={SLUG_TEST[langue]}
              langue={langue}
              utm={utm}
              promo={promo}
              onResult={testTermine}
              onClose={fermerTest}
            />
          </div>
        </Portal>
      )}

      {etape === "cours" && page && (
        <Portal>
          {/* La Delivery Page, TELLE QUELLE (plein écran) : vidéo, formulaire, déblocage, code promo. */}
          <DeliveryLanding data={page} />
          <button type="button" onClick={fermer} aria-label={t.close}
            className="fixed top-3 start-3 z-[260] w-10 h-10 grid place-items-center rounded-full bg-black/70 text-white shadow-lg">
            <X size={20} />
          </button>
        </Portal>
      )}
    </>
  );
}
