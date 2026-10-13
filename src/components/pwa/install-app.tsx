"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { X, Share, PlusSquare, MoreVertical } from "lucide-react";

/**
 * « 📲 Installer l'application Arazzo » : un bandeau discret, en bas de l'écran, sur mobile.
 *  - Android / Chrome : un vrai bouton qui ouvre la fenêtre d'installation du téléphone ;
 *  - iPhone (Safari) : les 2 gestes à faire (Partager → « Sur l'écran d'accueil ») ;
 *  - autre navigateur (ex. ouvert depuis Instagram / Facebook) : comment l'ouvrir dans Chrome / Safari.
 * Jamais affiché si l'application est déjà installée (ouverte en plein écran), ni dans les espaces de travail
 * (admin, formateur…). « Plus tard » le masque 7 jours.
 */

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const CLE = "arazzo-install-plus-tard";
const MASQUE_JOURS = 7;
const ESPACES_EXCLUS = ["/application", "/admin", "/formateur", "/studio", "/patronniste", "/auth", "/login", "/register"];

function estInstallee(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(display-mode: standalone)").matches
    || (navigator as unknown as { standalone?: boolean }).standalone === true;
}

function masqueRecemment(): boolean {
  try {
    const v = Number(localStorage.getItem(CLE) || 0);
    return v > 0 && Date.now() - v < MASQUE_JOURS * 86_400_000;
  } catch { return false; }
}

export function InstallApp() {
  const pathname = usePathname() || "/";
  const [evenement, setEvenement] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [plateforme, setPlateforme] = useState<"android" | "ios" | "autre">("autre");
  const [aide, setAide] = useState(false);

  useEffect(() => {
    if (estInstallee() || masqueRecemment()) return;
    const ua = navigator.userAgent || "";
    const mobile = /Android|iPhone|iPad|iPod/i.test(ua);
    if (!mobile) return; // sur ordinateur : rien (le navigateur propose déjà l'installation dans sa barre)
    const ios = /iPhone|iPad|iPod/i.test(ua);
    const safari = ios && /Safari/i.test(ua) && !/CriOS|FxiOS|FBAN|FBAV|Instagram/i.test(ua);
    // Ouvert DANS Instagram / Facebook / TikTok : leur navigateur intégré ne sait pas installer → aide « ouvrir dans Chrome ».
    const integre = /FBAN|FBAV|Instagram|TikTok|musical_ly|; wv\)/i.test(ua);
    setPlateforme(ios ? (safari ? "ios" : "autre") : (integre ? "autre" : "android"));

    const surPrompt = (e: Event) => {
      e.preventDefault(); // on garde la fenêtre d'installation pour NOTRE bouton
      setEvenement(e as BeforeInstallPromptEvent);
      setPlateforme("android");
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", surPrompt);
    const installee = () => setVisible(false);
    window.addEventListener("appinstalled", installee);
    // iPhone (pas d'événement d'installation) et navigateurs intégrés : on montre le bandeau après quelques secondes.
    const t = window.setTimeout(() => setVisible(true), 6000);
    return () => {
      window.removeEventListener("beforeinstallprompt", surPrompt);
      window.removeEventListener("appinstalled", installee);
      window.clearTimeout(t);
    };
  }, []);

  if (!visible || ESPACES_EXCLUS.some((p) => pathname.startsWith(p))) return null;

  const plusTard = () => {
    try { localStorage.setItem(CLE, String(Date.now())); } catch { /* ignore */ }
    setVisible(false);
  };

  async function installer() {
    if (evenement) {
      await evenement.prompt();
      const choix = await evenement.userChoice.catch(() => null);
      setEvenement(null);
      if (choix?.outcome === "accepted") setVisible(false);
      return;
    }
    setAide(true);
  }

  return (
    <div
      role="dialog"
      aria-label="Installer l'application Arazzo"
      className="fixed inset-x-3 z-[60] rounded-2xl shadow-2xl bg-white text-[#1a1a2e] dark:bg-[#1c1730] dark:text-white border border-purple-200 dark:border-purple-900 p-3"
      style={{ bottom: "calc(env(safe-area-inset-bottom) + 84px)" }}
    >
      <div className="flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/arazzo-icon.png" alt="" width={44} height={44} className="rounded-xl shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm">📲 Installer l’application Arazzo</div>
          <div className="text-xs opacity-75" dir="rtl">حمّلي تطبيق Arazzo على تيليفونك</div>
        </div>
        <button type="button" onClick={installer}
          className="shrink-0 bg-[#6B21C8] text-white text-sm font-semibold px-4 py-2 rounded-xl">
          Installer
        </button>
        <button type="button" onClick={plusTard} aria-label="Plus tard" className="shrink-0 p-1 opacity-60">
          <X size={18} />
        </button>
      </div>

      {aide ? (
        <div className="mt-3 text-sm leading-relaxed border-t border-purple-100 dark:border-purple-900 pt-3">
          {plateforme === "ios" ? (
            <>
              <p className="flex items-center gap-1 flex-wrap">1. Touchez <Share size={16} className="inline" /> <b>Partager</b> (en bas de Safari)</p>
              <p className="flex items-center gap-1 flex-wrap">2. Puis <PlusSquare size={16} className="inline" /> <b>Sur l’écran d’accueil</b> → <b>Ajouter</b></p>
              <p className="mt-1 opacity-75" dir="rtl">اضغطي على « مشاركة » ⬆️ ثم « إضافة إلى الشاشة الرئيسية »</p>
            </>
          ) : plateforme === "android" ? (
            <>
              <p className="flex items-center gap-1 flex-wrap">1. Touchez <MoreVertical size={16} className="inline" /> (menu de Chrome, en haut à droite)</p>
              <p>2. Puis <b>Installer l’application</b> (ou <b>Ajouter à l’écran d’accueil</b>)</p>
              <p className="mt-1 opacity-75" dir="rtl">اضغطي على ⋮ ثم « تثبيت التطبيق »</p>
            </>
          ) : (
            <>
              <p>Ouvrez ce site dans <b>Chrome</b> (Android) ou <b>Safari</b> (iPhone) : touchez ⋯ puis <b>Ouvrir dans le navigateur</b>, et revenez sur ce bouton.</p>
              <p className="mt-1 opacity-75" dir="rtl">افتحي الموقع في Chrome ولا Safari ومن بعد اضغطي « تثبيت »</p>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
