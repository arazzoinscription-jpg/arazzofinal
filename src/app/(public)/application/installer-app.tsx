"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Share, PlusSquare, MoreVertical } from "lucide-react";

/**
 * « 📲 Installer l’application Arazzo » — deux boutons, Android et iPhone.
 *  - Android (Chrome, Samsung Internet, Firefox) : la vraie fenêtre d’installation quand le navigateur la propose,
 *    sinon les gestes du menu ;
 *  - iPhone (Safari) : les 2 gestes (Partager → « Sur l’écran d’accueil »), puis « C’est fait ».
 * Venue d’un e-mail (`?t=…&cb=…`), la page prévient l’OS de l’école : « page ouverte », puis « application installée »
 * — une note s’ajoute sur la fiche de la personne. Rien d’autre n’est envoyé (ni nom, ni adresse).
 */

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};
type Os = "android" | "ios";

function signaler(cb: string | null, evt: "vue" | "installe" | "declare") {
  if (!cb || !/^https:\/\/[^\s]+\/v1\/public\/app\/[\w.-]+$/.test(cb)) return;
  const url = `${cb}?evt=${evt}`;
  try {
    if (navigator.sendBeacon?.(url, new Blob([""], { type: "text/plain" }))) return;
  } catch { /* on tente fetch */ }
  fetch(url, { method: "POST", mode: "no-cors", keepalive: true }).catch(() => {});
}

export function InstallerApp() {
  const params = useSearchParams();
  const cb = params.get("cb");
  const [os, setOs] = useState<Os | null>(params.get("os") === "ios" ? "ios" : params.get("os") === "android" ? "android" : null);
  const [evenement, setEvenement] = useState<BeforeInstallPromptEvent | null>(null);
  const [installee, setInstallee] = useState(false);
  const [integre, setIntegre] = useState(false);
  const dejaSignale = useRef<Set<string>>(new Set());

  const une = (evt: "vue" | "installe" | "declare") => {
    if (dejaSignale.current.has(evt)) return;
    dejaSignale.current.add(evt);
    signaler(cb, evt);
  };

  useEffect(() => {
    const ua = navigator.userAgent || "";
    if (!os) setOs(/iPhone|iPad|iPod/i.test(ua) ? "ios" : "android");
    setIntegre(/FBAN|FBAV|Instagram|TikTok|musical_ly|GSA\/|; wv\)/i.test(ua));
    if (window.matchMedia?.("(display-mode: standalone)").matches) setInstallee(true);
    une("vue");
    const surPrompt = (e: Event) => { e.preventDefault(); setEvenement(e as BeforeInstallPromptEvent); };
    const surInstallee = () => { setInstallee(true); une("installe"); };
    window.addEventListener("beforeinstallprompt", surPrompt);
    window.addEventListener("appinstalled", surInstallee);
    return () => {
      window.removeEventListener("beforeinstallprompt", surPrompt);
      window.removeEventListener("appinstalled", surInstallee);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function installerAndroid() {
    setOs("android");
    if (!evenement) return;
    await evenement.prompt();
    const choix = await evenement.userChoice.catch(() => null);
    setEvenement(null);
    if (choix?.outcome === "accepted") { setInstallee(true); une("installe"); }
  }

  const bouton = (actif: boolean) =>
    `flex-1 rounded-2xl px-4 py-4 font-semibold text-base border-2 ${actif ? "bg-[#6B21C8] text-white border-[#6B21C8]" : "bg-white text-[#1a1a2e] border-purple-200"}`;

  return (
    <div className="w-full max-w-md text-[#1a1a2e]">
      <div className="text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/arazzo-icon.png" alt="" width={84} height={84} className="mx-auto rounded-3xl shadow-lg" />
        <h1 className="mt-4 text-2xl font-bold">📲 L’application Arazzo</h1>
        <p className="mt-1 text-sm opacity-75">Gratuite · vos cours, patrons et nouveautés toujours avec vous</p>
        <p className="mt-1 text-base" dir="rtl">تطبيق Arazzo مجاني : الدروس والباترونات ديما معاك</p>
      </div>

      {installee ? (
        <div className="mt-8 rounded-2xl bg-green-50 border border-green-200 p-5 text-center">
          <p className="text-lg font-bold text-green-800">✅ Merci, l’application est installée !</p>
          <p className="mt-1" dir="rtl">شكرا ! التطبيق راهو على تيليفونك 🌸</p>
          <p className="mt-2 text-sm opacity-75">Retrouvez l’icône Arazzo sur l’écran d’accueil de votre téléphone.</p>
        </div>
      ) : (
        <>
          <div className="mt-8 flex gap-3">
            <button type="button" className={bouton(os === "android")} onClick={installerAndroid}>🤖 Android</button>
            <button type="button" className={bouton(os === "ios")} onClick={() => setOs("ios")}>🍎 iPhone</button>
          </div>

          {integre ? (
            <div className="mt-5 rounded-2xl bg-amber-50 border border-amber-200 p-4 text-sm leading-relaxed">
              <p>Vous êtes dans l’application Instagram, Facebook ou Gmail : touchez <b>⋯</b> puis <b>Ouvrir dans le navigateur</b> (Chrome ou Safari), puis revenez sur ce bouton.</p>
              <p className="mt-1" dir="rtl">اضغطي على ⋯ ثم « فتح في المتصفح » (Chrome ولا Safari)</p>
            </div>
          ) : null}

          <div className="mt-5 rounded-2xl bg-white border border-purple-100 p-5 text-sm leading-relaxed shadow-sm">
            {os === "ios" ? (
              <>
                <p className="font-semibold mb-2">Sur iPhone (avec Safari) :</p>
                <p className="flex items-center gap-1 flex-wrap">1. Touchez <Share size={16} className="inline" /> <b>Partager</b> (en bas de l’écran)</p>
                <p className="flex items-center gap-1 flex-wrap mt-1">2. Puis <PlusSquare size={16} className="inline" /> <b>Sur l’écran d’accueil</b> → <b>Ajouter</b></p>
                <p className="mt-2" dir="rtl">اضغطي على « مشاركة » ⬆️ ثم « إضافة إلى الشاشة الرئيسية »</p>
                <button type="button" onClick={() => { setInstallee(true); une("declare"); }}
                  className="mt-4 w-full rounded-xl bg-green-600 text-white font-semibold py-3">✅ C’est fait, je l’ai installée / درتها</button>
              </>
            ) : evenement ? (
              <>
                <p>Touchez <b>🤖 Android</b> ci-dessus, puis <b>Installer</b> dans la fenêtre qui s’ouvre.</p>
                <p className="mt-2" dir="rtl">اضغطي على Android ومن بعد « تثبيت »</p>
              </>
            ) : (
              <>
                <p className="font-semibold mb-2">Sur Android (Chrome, Samsung Internet ou Firefox) :</p>
                <p className="flex items-center gap-1 flex-wrap">1. Touchez <MoreVertical size={16} className="inline" /> (le menu du navigateur)</p>
                <p className="mt-1">2. Puis <b>Installer l’application</b> (ou <b>Ajouter à l’écran d’accueil</b>)</p>
                <p className="mt-2" dir="rtl">اضغطي على ⋮ ثم « تثبيت التطبيق »</p>
                <button type="button" onClick={() => { setInstallee(true); une("declare"); }}
                  className="mt-4 w-full rounded-xl bg-green-600 text-white font-semibold py-3">✅ C’est fait, je l’ai installée / درتها</button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
